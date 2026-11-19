/* Taskline browser backend.
 *
 * A dependency-free replacement for the old Python server. It implements the
 * same API surface the UI calls and stores everything in localStorage, so the
 * app runs by simply opening index.html.
 *
 * Nothing here is a security boundary: data lives in this browser profile and
 * anyone with access to the profile can read it. Password hashes exist so a
 * casual visitor cannot open someone else's list, not to protect against a
 * determined attacker with access to the machine.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ constants */

  const USERS_KEY = 'taskline.users.v1';
  const SESSION_KEY = 'taskline.session.v1';
  const TEAMS_KEY = 'taskline.teams.v1';
  const personalKey = (userId) => `taskline.personal.v1.${userId}`;
  const teamKey = (teamId) => `taskline.team.v1.${teamId}`;

  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const RESET_TTL_MS = 15 * 60 * 1000;
  const CODE_TTL_MS = 15 * 60 * 1000;
  const PBKDF2_ITERATIONS = 240000;
  const MAX_LOGIN_FAILURES = 8;
  const LOGIN_FAILURE_WINDOW_MS = 10 * 60 * 1000;
  const MAX_TASKS_PER_LIST = 10000;

  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const TEAM_ID_RE = /^team_[a-f0-9]{32}$/;
  const TASK_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const USER_ID_RE = /^[a-f0-9]{32}$/;

  const TASK_STATUSES = new Set(['todo', 'inprogress', 'hold', 'complete']);
  const TASK_PRIORITIES = new Set(['high', 'medium', 'low']);

  /* --------------------------------------------------------------- errors */

  class ApiError extends Error {
    constructor(message, status, code, extra) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.data = Object.assign({}, extra || {});
    }
  }

  /* ---------------------------------------------------------------- bytes */

  function randomBytes(length) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }

  function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function randomHex(byteCount) {
    return toHex(randomBytes(byteCount));
  }

  function toBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }

  function fromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function concatBytes(left, right) {
    const merged = new Uint8Array(left.length + right.length);
    merged.set(left);
    merged.set(right, left.length);
    return merged;
  }

  function timingSafeEqual(left, right) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left[index] ^ right[index];
    }
    return difference === 0;
  }

  /* --------------------------------------------------------------- sha-256 */

  // Fallback for browsers or origins without Web Crypto (for example a plain
  // http:// page on a LAN address). Slow but correct.
  const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  function rotateRight(value, bits) {
    return (value >>> bits) | (value << (32 - bits));
  }

  function sha256(bytes) {
    const length = bytes.length;
    const bitLength = length * 8;
    const paddedLength = (((length + 8) >> 6) + 1) << 6;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    const hash = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const schedule = new Uint32Array(64);

    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let index = 0; index < 16; index += 1) {
        schedule[index] = view.getUint32(offset + index * 4);
      }
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotateRight(schedule[index - 15], 7)
          ^ rotateRight(schedule[index - 15], 18)
          ^ (schedule[index - 15] >>> 3);
        const s1 = rotateRight(schedule[index - 2], 17)
          ^ rotateRight(schedule[index - 2], 19)
          ^ (schedule[index - 2] >>> 10);
        schedule[index] = (schedule[index - 16] + s0 + schedule[index - 7] + s1) >>> 0;
      }

      let a = hash[0];
      let b = hash[1];
      let c = hash[2];
      let d = hash[3];
      let e = hash[4];
      let f = hash[5];
      let g = hash[6];
      let h = hash[7];

      for (let index = 0; index < 64; index += 1) {
        const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choose = (e & f) ^ (~e & g);
        const temp1 = (h + sigma1 + choose + SHA256_K[index] + schedule[index]) >>> 0;
        const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (sigma0 + majority) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }

    const digest = new Uint8Array(32);
    const digestView = new DataView(digest.buffer);
    for (let index = 0; index < 8; index += 1) {
      digestView.setUint32(index * 4, hash[index]);
    }
    return digest;
  }

  function hmacSha256(keyBytes, messageBytes) {
    const key = keyBytes.length > 64 ? sha256(keyBytes) : keyBytes;
    const block = new Uint8Array(64);
    block.set(key);
    const inner = new Uint8Array(64);
    const outer = new Uint8Array(64);
    for (let index = 0; index < 64; index += 1) {
      inner[index] = block[index] ^ 0x36;
      outer[index] = block[index] ^ 0x5c;
    }
    return sha256(concatBytes(outer, sha256(concatBytes(inner, messageBytes))));
  }

  function pbkdf2Fallback(password, salt, iterations) {
    const passwordBytes = new TextEncoder().encode(password);
    const firstBlock = concatBytes(salt, new Uint8Array([0, 0, 0, 1]));
    let block = hmacSha256(passwordBytes, firstBlock);
    const output = block.slice();
    for (let round = 1; round < iterations; round += 1) {
      block = hmacSha256(passwordBytes, block);
      for (let index = 0; index < output.length; index += 1) {
        output[index] ^= block[index];
      }
    }
    return output;
  }

  async function pbkdf2(password, salt, iterations) {
    const subtle = !window.TasklineForceFallback && window.crypto && window.crypto.subtle;
    if (subtle) {
      const key = await subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
      );
      const bits = await subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        key,
        256,
      );
      return new Uint8Array(bits);
    }
    return pbkdf2Fallback(password, salt, iterations);
  }

  async function hashSecret(secret) {
    const salt = randomBytes(16);
    const digest = await pbkdf2(secret, salt, PBKDF2_ITERATIONS);
    return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(digest)}`;
  }

  async function verifySecret(secret, encoded) {
    try {
      const parts = String(encoded || '').split('$');
      if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
      const iterations = Number(parts[1]);
      if (!Number.isFinite(iterations) || iterations < 1) return false;
      const salt = fromBase64(parts[2]);
      const expected = fromBase64(parts[3]);
      const actual = await pbkdf2(secret, salt, iterations);
      return timingSafeEqual(actual, expected);
    } catch (error) {
      return false;
    }
  }

  /* -------------------------------------------------------------- storage */

  function readJson(key, fallback) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      throw new ApiError('This browser is blocking local storage.', 500, 'storage_error');
    }
    if (raw === null || raw === undefined || raw === '') return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new ApiError(`${key} contains invalid JSON.`, 500, 'storage_error');
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new ApiError(
        'This browser is out of storage space, so the change was not saved.',
        507,
        'storage_error',
      );
    }
  }

  /* ----------------------------------------------------------- validation */

  function normalizeEmail(value) {
    return String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  }

  function normalizeAnswer(value) {
    return String(value === undefined || value === null ? '' : value)
      .trim()
      .split(/\s+/)
      .join(' ')
      .toLowerCase();
  }

  function normalizeName(value) {
    return String(value === undefined || value === null ? '' : value).trim().split(/\s+/).join(' ');
  }

  function validateName(name, label) {
    const wording = label || 'Your name';
    if (name.length < 2) {
      throw new ApiError(`Enter ${wording.toLowerCase()} (at least 2 characters).`, 400, 'invalid_name');
    }
    if (name.length > 80) {
      throw new ApiError(`${wording} must be 80 characters or fewer.`, 400, 'invalid_name');
    }
  }

  function validateEmail(email) {
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      throw new ApiError('Enter a valid email address.', 400, 'invalid_email');
    }
  }

  function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
      throw new ApiError('Password must be at least 8 characters.', 400, 'weak_password');
    }
    if (password.length > 200) {
      throw new ApiError('Password must be 200 characters or fewer.', 400, 'weak_password');
    }
  }

  function validateMaidenName(answer) {
    if (answer.length < 2) {
      throw new ApiError("Enter your mother's maiden name (at least 2 characters).", 400, 'invalid_maiden');
    }
    if (answer.length > 80) {
      throw new ApiError("Mother's maiden name must be 80 characters or fewer.", 400, 'invalid_maiden');
    }
  }

  /* ---------------------------------------------------------------- users */

  function loadUsers() {
    const users = readJson(USERS_KEY, []);
    if (!Array.isArray(users)) {
      throw new ApiError('Stored accounts are corrupted.', 500, 'storage_error');
    }
    return users;
  }

  function saveUsers(users) {
    writeJson(USERS_KEY, users);
  }

  function publicName(user) {
    if (!user) return '';
    return user.name || String(user.email || '').split('@')[0];
  }

  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: publicName(user),
      email: user.email,
      createdAt: user.createdAt,
      passwordChangedAt: user.passwordChangedAt,
    };
  }

  function findUserByEmail(email) {
    const wanted = normalizeEmail(email);
    return loadUsers().find((user) => user.email === wanted) || null;
  }

  function findUserById(userId) {
    return loadUsers().find((user) => user.id === userId) || null;
  }

  async function createUser(name, email, password, maidenName) {
    const cleanEmail = normalizeEmail(email);
    const displayName = normalizeName(name);
    const answer = normalizeAnswer(maidenName);

    validateName(displayName);
    validateEmail(cleanEmail);
    validatePassword(password);
    validateMaidenName(answer);

    const users = loadUsers();
    if (users.some((user) => user.email === cleanEmail)) {
      throw new ApiError('An account with that email already exists.', 409, 'email_taken');
    }

    const now = new Date().toISOString();
    const user = {
      id: randomHex(16),
      name: displayName,
      email: cleanEmail,
      passwordHash: await hashSecret(password),
      maidenHash: await hashSecret(answer),
      createdAt: now,
      updatedAt: now,
      passwordChangedAt: now,
      lastLoginAt: now,
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  async function checkMaidenName(user, answer) {
    return verifySecret(normalizeAnswer(answer), user.maidenHash || '');
  }

  async function updatePassword(userId, newPassword) {
    validatePassword(newPassword);

    const users = loadUsers();
    const user = users.find((item) => item.id === userId);
    if (!user) throw new ApiError('Account not found.', 404, 'not_found');

    if (await verifySecret(newPassword, user.passwordHash || '')) {
      throw new ApiError('That is your current password. Enter a different password.', 400, 'same_password');
    }

    user.passwordHash = await hashSecret(newPassword);
    user.passwordChangedAt = new Date().toISOString();
    user.updatedAt = user.passwordChangedAt;
    saveUsers(users);
    revokeUserSessions(userId);
  }

  function markLogin(userId) {
    const users = loadUsers();
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);
  }

  /* ------------------------------------------------------------- sessions */

  function loadSession() {
    const session = readJson(SESSION_KEY, null);
    if (!session || typeof session !== 'object') return null;
    if (typeof session.token !== 'string' || typeof session.userId !== 'string') return null;
    if (typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  }

  function saveSession(session) {
    writeJson(SESSION_KEY, session);
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function createSession(userId) {
    const session = {
      token: randomHex(24),
      userId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    saveSession(session);
    return session;
  }

  function deleteSession() {
    clearSession();
  }

  function revokeUserSessions(userId) {
    const session = loadSession();
    if (session && session.userId === userId) clearSession();
  }

  function currentUser() {
    const session = loadSession();
    if (!session) return null;
    const user = findUserById(session.userId);
    if (!user) {
      clearSession();
      return null;
    }
    return user;
  }

  function requireUser() {
    const user = currentUser();
    if (!user) {
      throw new ApiError('Please sign in to continue.', 401, 'unauthorized');
    }
    return user;
  }

  /* ------------------------------------------------- login throttling */

  const loginFailures = new Map();

  function checkLoginAllowed(email) {
    const entry = loginFailures.get(email);
    if (!entry) return;
    if (Date.now() - entry.firstAt > LOGIN_FAILURE_WINDOW_MS) {
      loginFailures.delete(email);
      return;
    }
    if (entry.count >= MAX_LOGIN_FAILURES) {
      const minutes = Math.max(1, Math.ceil((LOGIN_FAILURE_WINDOW_MS - (Date.now() - entry.firstAt)) / 60000));
      throw new ApiError(
        `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        429,
        'too_many_attempts',
      );
    }
  }

  function recordLoginFailure(email) {
    const entry = loginFailures.get(email);
    if (!entry || Date.now() - entry.firstAt > LOGIN_FAILURE_WINDOW_MS) {
      loginFailures.set(email, { count: 1, firstAt: Date.now() });
      return;
    }
    entry.count += 1;
  }

  function clearLoginFailures(email) {
    loginFailures.delete(email);
  }

  /* ----------------------------------------------------------- challenges */

  const resetTokens = new Map();
  const emailCodes = new Map();
  const outbox = new Map();

  function pruneChallenges() {
    const now = Date.now();
    for (const [token, entry] of resetTokens) {
      if (entry.expiresAt <= now) resetTokens.delete(token);
    }
    for (const [email, entry] of emailCodes) {
      if (entry.expiresAt <= now) emailCodes.delete(email);
    }
  }

  function createResetToken(email) {
    pruneChallenges();
    const token = randomHex(24);
    resetTokens.set(token, { email: normalizeEmail(email), expiresAt: Date.now() + RESET_TTL_MS });
    return token;
  }

  function consumeResetToken(token) {
    pruneChallenges();
    const entry = resetTokens.get(token);
    if (!entry) {
      throw new ApiError('That verification link has expired. Request a new one.', 400, 'invalid_token');
    }
    resetTokens.delete(token);
    return entry.email;
  }

  function createEmailCode(email) {
    pruneChallenges();
    const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    emailCodes.set(normalizeEmail(email), {
      hash: null,
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
    });
    return code;
  }

  async function verifyEmailCode(email, code) {
    pruneChallenges();
    const key = normalizeEmail(email);
    const entry = emailCodes.get(key);
    if (!entry) {
      throw new ApiError('No active verification code. Request a new one.', 400, 'invalid_code');
    }
    entry.attempts += 1;
    if (entry.attempts > 5) {
      emailCodes.delete(key);
      throw new ApiError('Too many incorrect codes. Request a new one.', 429, 'too_many_attempts');
    }
    if (String(code || '').trim() !== entry.code) {
      throw new ApiError('That verification code is not correct.', 400, 'invalid_code');
    }
    emailCodes.delete(key);
  }

  function clearChallenges(email) {
    const key = normalizeEmail(email);
    emailCodes.delete(key);
    for (const [token, entry] of resetTokens) {
      if (entry.email === key) resetTokens.delete(token);
    }
  }

  // The app has no mail server, so the code is shown in the UI instead.
  function deliverCode(email, code) {
    outbox.set(normalizeEmail(email), {
      to: normalizeEmail(email),
      subject: 'Your Taskline password reset code',
      body:
        'Use this code to reset your Taskline password:\n\n'
        + `    ${code}\n\n`
        + 'The code expires in 15 minutes. This app runs without a server, so the '
        + 'message is shown here instead of being emailed.\n\n— Taskline',
      code,
      createdAt: new Date().toISOString(),
    });
    return { delivery: 'outbox' };
  }

  function latestMail(email) {
    const message = outbox.get(normalizeEmail(email));
    if (!message) {
      throw new ApiError('No recovery message was generated for that address.', 404, 'not_found');
    }
    return message;
  }

  /* ---------------------------------------------------------------- teams */

  function loadTeams() {
    const teams = readJson(TEAMS_KEY, []);
    if (!Array.isArray(teams)) {
      throw new ApiError('Stored teams are corrupted.', 500, 'storage_error');
    }
    return teams;
  }

  function saveTeams(teams) {
    writeJson(TEAMS_KEY, teams);
  }

  function teamsForUser(userId) {
    return loadTeams().filter((team) => Array.isArray(team.memberIds) && team.memberIds.includes(userId));
  }

  function teamPublic(team, viewerId) {
    const users = loadUsers();
    const byId = new Map(users.map((user) => [user.id, user]));
    const members = [];
    for (const memberId of team.memberIds || []) {
      const member = byId.get(memberId);
      if (!member) continue;
      members.push({ id: memberId, name: publicName(member), email: member.email || '' });
    }
    const owner = byId.get(team.ownerId);
    return {
      id: team.id,
      name: team.name || '',
      ownerId: team.ownerId,
      ownerName: owner ? publicName(owner) : 'Unknown',
      isOwner: team.ownerId === viewerId,
      members,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  function getTeamForMember(teamId, userId) {
    if (!TEAM_ID_RE.test(String(teamId || ''))) {
      throw new ApiError('Team not found.', 404, 'team_not_found');
    }
    const team = loadTeams().find((item) => item.id === teamId);
    if (!team || !(team.memberIds || []).includes(userId)) {
      throw new ApiError('Team not found.', 404, 'team_not_found');
    }
    return team;
  }

  function normalizeEmailList(value) {
    let parts = [];
    if (typeof value === 'string') {
      parts = value.split(/[,;\s]+/);
    } else if (Array.isArray(value)) {
      parts = value.map((item) => String(item));
    }
    const emails = [];
    for (const part of parts) {
      const email = normalizeEmail(part);
      if (email && !emails.includes(email)) emails.push(email);
    }
    return emails;
  }

  function resolveMemberIds(emails, owner) {
    const users = loadUsers();
    const byEmail = new Map(users.map((user) => [user.email, user]));
    const memberIds = [owner.id];
    const unknown = [];
    for (const email of emails) {
      const member = byEmail.get(email);
      if (!member) {
        unknown.push(email);
        continue;
      }
      if (!memberIds.includes(member.id)) memberIds.push(member.id);
    }
    if (unknown.length) {
      throw new ApiError(
        `No account was found for: ${unknown.join(', ')}`,
        404,
        'unknown_members',
        { unknown },
      );
    }
    return memberIds;
  }

  function createTeam(owner, name, memberEmails) {
    const teamName = normalizeName(name);
    validateName(teamName, 'Team name');
    const emails = normalizeEmailList(memberEmails);
    const memberIds = resolveMemberIds(emails, owner);
    const teams = loadTeams();
    const now = new Date().toISOString();
    const team = {
      id: `team_${randomHex(16)}`,
      name: teamName,
      ownerId: owner.id,
      memberIds,
      createdAt: now,
      updatedAt: now,
    };
    teams.push(team);
    saveTeams(teams);
    return teamPublic(team, owner.id);
  }

  function updateTeam(teamId, user, payload) {
    const teams = loadTeams();
    const team = teams.find((item) => item.id === teamId);
    if (!team) throw new ApiError('Team not found.', 404, 'team_not_found');
    if (team.ownerId !== user.id) {
      throw new ApiError('Only the team owner can change this team.', 403, 'not_team_owner');
    }

    let memberIds = (team.memberIds || []).slice();
    let changed = false;

    if (payload.name !== undefined && payload.name !== null) {
      const teamName = normalizeName(payload.name);
      validateName(teamName, 'Team name');
      if (teamName !== team.name) {
        team.name = teamName;
        changed = true;
      }
    }

    const additions = normalizeEmailList(payload.addEmails);
    if (additions.length) {
      for (const memberId of resolveMemberIds(additions, user)) {
        if (!memberIds.includes(memberId)) {
          memberIds.push(memberId);
          changed = true;
        }
      }
    }

    const removals = normalizeEmailList(payload.removeEmails);
    if (removals.length) {
      const users = loadUsers();
      const byEmail = new Map(users.map((item) => [item.email, item]));
      const unknown = removals.filter((email) => !byEmail.has(email));
      if (unknown.length) {
        throw new ApiError(
          `No account was found for: ${unknown.join(', ')}`,
          404,
          'unknown_members',
          { unknown },
        );
      }
      const removeIds = new Set(removals.map((email) => byEmail.get(email).id));
      if (removeIds.has(team.ownerId)) {
        throw new ApiError('The team owner cannot be removed.', 400, 'cannot_remove_owner');
      }
      for (const memberId of memberIds.slice()) {
        if (removeIds.has(memberId)) {
          memberIds = memberIds.filter((item) => item !== memberId);
          changed = true;
        }
      }
    }

    if (changed) {
      team.memberIds = memberIds;
      team.updatedAt = new Date().toISOString();
      saveTeams(teams);
    }
    return teamPublic(team, user.id);
  }

  function deleteTeam(teamId, user) {
    const teams = loadTeams();
    const team = teams.find((item) => item.id === teamId);
    if (!team) throw new ApiError('Team not found.', 404, 'team_not_found');
    if (team.ownerId !== user.id) {
      throw new ApiError('Only the team owner can delete this team.', 403, 'not_team_owner');
    }
    saveTeams(teams.filter((item) => item.id !== teamId));
    try {
      localStorage.removeItem(teamKey(teamId));
    } catch (error) {
      /* ignore */
    }
  }

  /* ---------------------------------------------------------------- tasks */

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function readTaskList(key) {
    const list = readJson(key, []);
    return Array.isArray(list) ? list : [];
  }

  function writeTaskList(key, tasks) {
    writeJson(key, tasks);
  }

  function cleanTask(raw, options) {
    const existing = options.existing || null;
    const merged = Object.assign({}, existing || {}, raw && typeof raw === 'object' ? raw : {});

    let title = String(merged.title || '').trim();
    if (!title) throw new ApiError('Task title is required.', 400, 'invalid_task');
    title = title.slice(0, 140);

    const notes = typeof merged.notes === 'string' ? merged.notes.slice(0, 500) : '';

    const date = typeof merged.date === 'string' && DATE_RE.test(merged.date) ? merged.date : todayStr();
    const status = TASK_STATUSES.has(merged.status) ? merged.status : 'todo';
    const priority = TASK_PRIORITIES.has(merged.priority) ? merged.priority : 'medium';

    const archived = Boolean(merged.archived) || status === 'complete';
    let archivedAt = archived ? merged.archivedAt : null;
    if (archived && typeof archivedAt !== 'string') archivedAt = new Date().toISOString();

    let taskId = merged.id;
    if (!(typeof taskId === 'string' && TASK_ID_RE.test(taskId))) {
      taskId = existing ? existing.id : randomHex(16);
    }

    let createdAt = existing ? existing.createdAt : merged.createdAt;
    if (typeof createdAt !== 'string') createdAt = new Date().toISOString();

    let assigneeId = options.scope === 'team' ? merged.assigneeId : null;
    if (assigneeId === '' || assigneeId === undefined || assigneeId === null) {
      assigneeId = null;
    } else if (typeof assigneeId !== 'string') {
      throw new ApiError('Choose a member of this team as the assignee.', 400, 'invalid_assignee');
    } else if (
      options.memberIds
      && !options.memberIds.has(assigneeId)
      && !(existing && assigneeId === existing.assigneeId)
    ) {
      throw new ApiError('Choose a member of this team as the assignee.', 400, 'invalid_assignee');
    }

    const createdBy = existing && existing.createdBy ? existing.createdBy : options.createdBy;

    return {
      id: taskId,
      title,
      notes,
      date,
      status,
      priority,
      archived,
      archivedAt,
      createdAt,
      updatedAt: new Date().toISOString(),
      scope: options.scope,
      teamId: options.teamId,
      assigneeId,
      createdBy,
    };
  }

  function publicTask(task, options) {
    const users = loadUsers();
    const byId = new Map(users.map((user) => [user.id, user]));
    const assignee = byId.get(task.assigneeId);
    const creator = byId.get(task.createdBy);
    return Object.assign({}, task, {
      scope: options.scope,
      teamId: options.team ? options.team.id : null,
      teamName: options.team ? options.team.name : null,
      assigneeName: assignee ? publicName(assignee) : null,
      assigneeEmail: assignee ? assignee.email : null,
      createdByName: creator ? publicName(creator) : null,
      canDelete: Boolean(
        options.scope === 'personal'
        || (options.team
          && (options.viewerId === task.createdBy || options.viewerId === options.team.ownerId)),
      ),
    });
  }

  function listTasks(user) {
    const result = [];
    for (const task of readTaskList(personalKey(user.id))) {
      result.push(publicTask(task, { scope: 'personal', team: null, viewerId: user.id }));
    }
    for (const team of teamsForUser(user.id)) {
      for (const task of readTaskList(teamKey(team.id))) {
        result.push(publicTask(task, { scope: 'team', team, viewerId: user.id }));
      }
    }
    return result;
  }

  function createTask(user, payload) {
    if (!payload || typeof payload !== 'object') {
      throw new ApiError('Expected a task object.', 400, 'invalid_task');
    }
    const scope = payload.scope === 'team' ? 'team' : 'personal';

    if (scope === 'team') {
      const team = getTeamForMember(payload.teamId, user.id);
      const tasks = readTaskList(teamKey(team.id));
      if (tasks.length >= MAX_TASKS_PER_LIST) {
        throw new ApiError('This team has too many tasks.', 413, 'too_many_tasks');
      }
      const task = cleanTask(payload, {
        scope: 'team',
        teamId: team.id,
        createdBy: user.id,
        memberIds: new Set(team.memberIds || []),
      });
      if (tasks.some((item) => item.id === task.id)) task.id = randomHex(16);
      tasks.push(task);
      writeTaskList(teamKey(team.id), tasks);
      return publicTask(task, { scope: 'team', team, viewerId: user.id });
    }

    const tasks = readTaskList(personalKey(user.id));
    if (tasks.length >= MAX_TASKS_PER_LIST) {
      throw new ApiError('You have too many tasks.', 413, 'too_many_tasks');
    }
    const task = cleanTask(payload, { scope: 'personal', teamId: null, createdBy: user.id });
    if (tasks.some((item) => item.id === task.id)) task.id = randomHex(16);
    tasks.push(task);
    writeTaskList(personalKey(user.id), tasks);
    return publicTask(task, { scope: 'personal', team: null, viewerId: user.id });
  }

  function findTaskLocation(userId, taskId) {
    const personal = readTaskList(personalKey(userId));
    const personalIndex = personal.findIndex((task) => task.id === taskId);
    if (personalIndex !== -1) {
      return { scope: 'personal', team: null, tasks: personal, index: personalIndex, task: personal[personalIndex] };
    }
    for (const team of teamsForUser(userId)) {
      const teamTasks = readTaskList(teamKey(team.id));
      const index = teamTasks.findIndex((task) => task.id === taskId);
      if (index !== -1) {
        return { scope: 'team', team, tasks: teamTasks, index, task: teamTasks[index] };
      }
    }
    throw new ApiError('Task not found.', 404, 'not_found');
  }

  function updateTask(user, taskId, payload) {
    if (!payload || typeof payload !== 'object') {
      throw new ApiError('Expected a task object.', 400, 'invalid_task');
    }
    const location = findTaskLocation(user.id, taskId);

    if (location.scope === 'team') {
      const team = location.team;
      const updated = cleanTask(payload, {
        scope: 'team',
        teamId: team.id,
        createdBy: user.id,
        existing: location.task,
        memberIds: new Set(team.memberIds || []),
      });
      location.tasks[location.index] = updated;
      writeTaskList(teamKey(team.id), location.tasks);
      return publicTask(updated, { scope: 'team', team, viewerId: user.id });
    }

    const updated = cleanTask(payload, {
      scope: 'personal',
      teamId: null,
      createdBy: user.id,
      existing: location.task,
    });
    location.tasks[location.index] = updated;
    writeTaskList(personalKey(user.id), location.tasks);
    return publicTask(updated, { scope: 'personal', team: null, viewerId: user.id });
  }

  function deleteTask(user, taskId) {
    const location = findTaskLocation(user.id, taskId);
    if (location.scope === 'team') {
      const team = location.team;
      if (user.id !== location.task.createdBy && user.id !== team.ownerId) {
        throw new ApiError('Only the task creator or team owner can delete this task.', 403, 'not_allowed');
      }
      location.tasks.splice(location.index, 1);
      writeTaskList(teamKey(team.id), location.tasks);
    } else {
      location.tasks.splice(location.index, 1);
      writeTaskList(personalKey(user.id), location.tasks);
    }
    return { ok: true, id: taskId };
  }

  function replacePersonalTasks(user, tasks) {
    if (tasks.length > MAX_TASKS_PER_LIST) {
      throw new ApiError('Too many tasks.', 413, 'too_many_tasks');
    }
    const cleaned = tasks.map((task) => cleanTask(task, {
      scope: 'personal',
      teamId: null,
      createdBy: user.id,
    }));
    writeTaskList(personalKey(user.id), cleaned);
    return { ok: true, count: cleaned.length };
  }

  /* --------------------------------------------------------------- router */

  async function handleAuth(method, path, payload) {
    if (path === '/api/auth/me' && method === 'GET') {
      return { ok: true, user: publicUser(currentUser()) };
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const user = await createUser(
        payload && payload.name,
        payload && payload.email,
        payload && payload.password,
        payload && payload.maidenName,
      );
      createSession(user.id);
      return { ok: true, user: publicUser(user) };
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const email = normalizeEmail(payload && payload.email);
      const password = String((payload && payload.password) || '');

      checkLoginAllowed(email);
      const user = findUserByEmail(email);

      if (!user || !(await verifySecret(password, user.passwordHash || ''))) {
        recordLoginFailure(email);
        throw new ApiError('Email or password is incorrect.', 401, 'invalid_credentials');
      }

      clearLoginFailures(email);
      markLogin(user.id);
      createSession(user.id);
      return { ok: true, user: publicUser(user) };
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      deleteSession();
      return { ok: true };
    }

    if (path === '/api/auth/change-password' && method === 'POST') {
      const user = requireUser();
      const currentPassword = String((payload && payload.currentPassword) || '');
      const newPassword = String((payload && payload.newPassword) || '');

      if (!(await verifySecret(currentPassword, user.passwordHash || ''))) {
        throw new ApiError('Your current password is not correct.', 400, 'invalid_credentials');
      }

      validatePassword(newPassword);
      if (await verifySecret(newPassword, user.passwordHash || '')) {
        throw new ApiError('That is your current password. Enter a different password.', 400, 'same_password');
      }

      if (!(await checkMaidenName(user, payload && payload.maidenName))) {
        const code = createEmailCode(user.email);
        const delivery = deliverCode(user.email, code);
        throw new ApiError(
          'That maiden name does not match. A verification code is shown below instead.',
          403,
          'maiden_mismatch',
          {
            recoverySent: true,
            email: user.email,
            delivery: delivery.delivery,
            devMode: true,
          },
        );
      }

      await updatePassword(user.id, newPassword);
      clearChallenges(user.email);
      return { ok: true, requiresRelogin: true, message: 'Password updated. Please sign in again.' };
    }

    if (path === '/api/auth/forgot' && method === 'POST') {
      const email = normalizeEmail(payload && payload.email);
      const user = findUserByEmail(email);
      if (!user) throw new ApiError('No account was found with that email.', 404, 'not_found');

      if (await checkMaidenName(user, payload && payload.maidenName)) {
        const token = createResetToken(email);
        return {
          ok: true,
          verifiedBy: 'maiden',
          resetToken: token,
          expiresIn: Math.round(RESET_TTL_MS / 1000),
          message: 'Maiden name verified. Choose a new password.',
        };
      }

      const code = createEmailCode(email);
      const delivery = deliverCode(email, code);
      return {
        ok: true,
        verifiedBy: 'email',
        email,
        delivery: delivery.delivery,
        devMode: true,
        message: 'That maiden name did not match. A verification code is shown below.',
      };
    }

    if (path === '/api/auth/reset' && method === 'POST') {
      const email = normalizeEmail(payload && payload.email);
      const user = findUserByEmail(email);
      if (!user) throw new ApiError('No account was found with that email.', 404, 'not_found');

      const newPassword = String((payload && payload.newPassword) || '');

      // Validate before consuming the one-time code so a rejected attempt
      // does not burn the recovery credential.
      validatePassword(newPassword);
      if (await verifySecret(newPassword, user.passwordHash || '')) {
        throw new ApiError('That is your current password. Enter a different password.', 400, 'same_password');
      }

      if (payload && payload.resetToken) {
        const tokenEmail = consumeResetToken(String(payload.resetToken));
        if (tokenEmail !== email) {
          throw new ApiError('That verification link is not valid for this account.', 400, 'invalid_token');
        }
      } else {
        await verifyEmailCode(email, payload && payload.code);
      }

      await updatePassword(user.id, newPassword);
      clearChallenges(email);
      return { ok: true, requiresRelogin: true, message: 'Password updated. Please sign in again.' };
    }

    throw new ApiError('Not found.', 404, 'not_found');
  }

  function handleTasks(method, path, payload) {
    if (path === '/api/tasks') {
      const user = requireUser();
      if (method === 'GET') return listTasks(user);
      if (method === 'POST') return createTask(user, payload);
      if (method === 'PUT') {
        const tasks = Array.isArray(payload) ? payload : (payload && payload.tasks);
        if (!Array.isArray(tasks)) {
          throw new ApiError('Expected a JSON array of tasks.', 400, 'invalid_body');
        }
        return replacePersonalTasks(user, tasks);
      }
      throw new ApiError('Not found.', 404, 'not_found');
    }

    const match = /^\/api\/tasks\/([^/]+)$/.exec(path);
    if (match) {
      const user = requireUser();
      const taskId = decodeURIComponent(match[1]);
      if (method === 'PATCH') return updateTask(user, taskId, payload);
      if (method === 'DELETE') return deleteTask(user, taskId);
      throw new ApiError('Not found.', 404, 'not_found');
    }

    throw new ApiError('Not found.', 404, 'not_found');
  }

  function handleTeams(method, path, payload) {
    if (path === '/api/teams') {
      const user = requireUser();
      if (method === 'GET') return teamsForUser(user.id).map((team) => teamPublic(team, user.id));
      if (method === 'POST') {
        return createTeam(user, payload && payload.name, payload && payload.memberEmails);
      }
      throw new ApiError('Not found.', 404, 'not_found');
    }

    const match = /^\/api\/teams\/([^/]+)$/.exec(path);
    if (match) {
      const user = requireUser();
      const teamId = decodeURIComponent(match[1]);
      if (method === 'PATCH') return updateTeam(teamId, user, payload || {});
      if (method === 'DELETE') {
        deleteTeam(teamId, user);
        return { ok: true };
      }
      throw new ApiError('Not found.', 404, 'not_found');
    }

    throw new ApiError('Not found.', 404, 'not_found');
  }

  async function request(method, url, payload) {
    const upperMethod = String(method || 'GET').toUpperCase();
    let parsed;
    try {
      parsed = new URL(url, window.location.href);
    } catch (error) {
      throw new ApiError('Invalid request.', 400, 'invalid_request');
    }
    // On Windows, file:///C:/... resolves an absolute /api path to
    // /C:/api/... in pathname, so strip that drive prefix.
    let path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (/^\/[A-Za-z]:/.test(path)) path = path.slice(3) || '/';

    if (path.startsWith('/api/auth/')) return handleAuth(upperMethod, path, payload);

    if (path === '/api/dev/last-mail') {
      const email = parsed.searchParams.get('email') || '';
      const message = latestMail(email);
      return {
        to: message.to,
        subject: message.subject,
        body: message.body,
        code: message.code,
        createdAt: message.createdAt,
      };
    }

    if (path === '/api/health') {
      return {
        ok: true,
        storage: 'browser localStorage',
        auth: 'local account',
        mail: 'in-app code',
      };
    }

    if (path === '/api/tasks' || path.startsWith('/api/tasks/')) {
      return handleTasks(upperMethod, path, payload);
    }

    if (path === '/api/teams' || path.startsWith('/api/teams/')) {
      return handleTeams(upperMethod, path, payload);
    }

    throw new ApiError('Not found.', 404, 'not_found');
  }

  window.TasklineBackend = {
    request,
    // Exposed for tests and for future import of older data.
    hashSecret,
    verifySecret,
  };
})();
