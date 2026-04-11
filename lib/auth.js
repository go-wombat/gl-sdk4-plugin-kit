/**
 * GL.iNet RPC authentication module.
 * Authenticates via HTTP RPC without requiring SSH.
 *
 * Algorithm:
 *   1. POST /rpc { method: "challenge", params: { username } }
 *      => { alg, salt, nonce }
 *   2. crypted = crypt(password, "$<alg>$<salt>$")  (MD5 Unix crypt)
 *   3. hash = sha256(username + ":" + crypted + ":" + nonce)
 *   4. POST /rpc { method: "login", params: { username, hash } }
 *      => { sid }
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

/**
 * Send a JSON-RPC request to the router.
 * @param {string} host - Router IP or hostname
 * @param {object} body - JSON-RPC body
 * @returns {Promise<object>} Parsed JSON response
 */
function rpcCall(host, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const isHttps = host.startsWith('https://');
    const cleanHost = host.replace(/^https?:\/\//, '');
    const mod = isHttps ? https : http;

    const req = mod.request(
      {
        hostname: cleanHost,
        port: isHttps ? 443 : 80,
        path: '/rpc',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        rejectUnauthorized: false,
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.error) {
              reject(new Error(json.error.message || 'RPC error'));
            } else {
              resolve(json.result);
            }
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    req.write(data);
    req.end();
  });
}

/**
 * Compute MD5 Unix crypt using openssl.
 * @param {string} password
 * @param {string} salt
 * @returns {string} Crypt hash (e.g. "$1$SALT$HASH")
 */
function unixCrypt(password, salt) {
  // Escape single quotes in password for shell
  const escapedPass = password.replace(/'/g, "'\\''");
  return execSync(`openssl passwd -1 -salt '${salt}' '${escapedPass}'`, {
    encoding: 'utf8',
  }).trim();
}

/**
 * Authenticate with a GL.iNet router via HTTP RPC.
 * @param {string} host - Router IP (e.g. "192.168.8.1")
 * @param {string} password - Admin password
 * @param {string} [username="root"] - Username
 * @returns {Promise<{sid: string, host: string}>} Session ID and host
 */
async function login(host, password, username = 'root') {
  // Step 1: Challenge
  const challenge = await rpcCall(host, {
    jsonrpc: '2.0',
    id: 1,
    method: 'challenge',
    params: { username },
  });

  const { alg, salt, nonce } = challenge;

  // Step 2: Crypt password
  const crypted = unixCrypt(password, salt);

  // Step 3: SHA256 hash
  const hashInput = `${username}:${crypted}:${nonce}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  // Step 4: Login
  const result = await rpcCall(host, {
    jsonrpc: '2.0',
    id: 2,
    method: 'login',
    params: { username, hash },
  });

  return { sid: result.sid, host };
}

/**
 * Make an authenticated RPC call.
 * @param {string} host - Router IP
 * @param {string} sid - Session ID from login()
 * @param {string} module - API module (e.g. "system")
 * @param {string} func - API function (e.g. "get_info")
 * @param {object} [params={}] - Call parameters
 * @returns {Promise<object>} API response
 */
async function call(host, sid, module, func, params = {}) {
  return rpcCall(host, {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'call',
    params: [sid, module, func, params],
  });
}

module.exports = { login, call, rpcCall };
