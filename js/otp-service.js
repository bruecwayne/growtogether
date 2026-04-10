/*!
 * GrowTogether — OTP Verification Service
 * =========================================
 * Handles phone & email OTP verification for all public forms.
 *
 * ── QUICK SETUP ──────────────────────────────────────────────
 *  1. demoMode: true  → OTP is shown in a browser alert (for development/testing)
 *  2. demoMode: false → Configure your SMS and/or Email provider credentials below
 *
 * SMS providers supported : fast2sms | msg91 | twilio
 * Email provider supported: emailjs  (load SDK from CDN — see comment below)
 *
 * EmailJS CDN (add to <head> if using email OTP in production):
 *   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
 * ─────────────────────────────────────────────────────────────
 */

const OTP_CONFIG = {
  otpLength:  6,
  expiryMs:   10 * 60 * 1000, // 10 minutes
  maxAttempts: 3,

  // Set to true ONLY during local development. In production this MUST be false.
  // OTP codes are sent via SMS/email provider configured below.
  // The submit button is disabled until OTP is verified client-side.
  // For full security, also verify the OTP server-side in a Parse Cloud Function.
  demoMode: false,

  sms: {
    // Choose: 'fast2sms' | 'msg91' | 'twilio'
    provider: 'fast2sms',

    // Fast2SMS  →  https://www.fast2sms.com/
    fast2smsApiKey: 'YOUR_FAST2SMS_API_KEY',
    senderId:       'GRWTGT',

    // MSG91  →  https://msg91.com/
    msg91AuthKey:   'YOUR_MSG91_AUTH_KEY',
    msg91TemplateId:'YOUR_MSG91_TEMPLATE_ID',

    // Twilio  →  https://www.twilio.com/
    twilioAccountSid: 'YOUR_TWILIO_ACCOUNT_SID',
    twilioAuthToken:  'YOUR_TWILIO_AUTH_TOKEN',
    twilioFrom:       '+1234567890',
  },

  email: {
    // EmailJS  →  https://www.emailjs.com/
    // Your template MUST include variables: {{otp_code}}, {{expiry_minutes}}, {{to_email}}
    serviceId:  'YOUR_EMAILJS_SERVICE_ID',
    templateId: 'YOUR_EMAILJS_OTP_TEMPLATE_ID',
    publicKey:  'YOUR_EMAILJS_PUBLIC_KEY',
    fromName:   'GrowTogether',
  },
};

// ─────────────────────────────────────────────
//  Core OTPService class
// ─────────────────────────────────────────────
class OTPService {
  constructor() {
    this._SESSION_KEY = 'gt_otp_state';
    this._state = this._loadState();
  }

  _loadState() {
    try {
      const raw  = sessionStorage.getItem(this._SESSION_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const now  = Date.now();
      // Purge expired entries to keep storage clean
      return Object.fromEntries(
        Object.entries(data).filter(([, v]) => v.expiry > now)
      );
    } catch { return {}; }
  }

  _saveState() {
    try { sessionStorage.setItem(this._SESSION_KEY, JSON.stringify(this._state)); }
    catch {}
  }

  _key(identifier, type) { return `${type}:${identifier.toLowerCase().trim()}`; }

  _generateOTP() {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return String(100000 + (buf[0] % 900000)); // always 6 digits
  }

  /** Send OTP to a phone number or email address */
  async sendOTP(identifier, type /* 'phone' | 'email' */) {
    const otp = this._generateOTP();
    const key = this._key(identifier, type);
    this._state[key] = {
      otp,
      expiry:   Date.now() + OTP_CONFIG.expiryMs,
      attempts: 0,
      verified: false,
    };
    this._saveState();

    if (OTP_CONFIG.demoMode) {
      const icon   = type === 'phone' ? '📱' : '📧';
      const target = type === 'phone' ? 'mobile number' : 'email address';
      console.info(`[GrowTogether OTP – Demo] ${identifier} → ${otp}`);
      // Use a small delay so the UI updates before the alert blocks the thread
      await new Promise(r => setTimeout(r, 50));
      alert(
        `${icon}  OTP Demo Mode\n` +
        `─────────────────────────\n` +
        `Your OTP for ${target}\n` +
        `${identifier}\n\n` +
        `  🔑  ${otp}\n\n` +
        `Valid for 10 minutes.\n\n` +
        `(To send real SMS/Email, set demoMode: false and\n` +
        ` configure credentials in js/otp-service.js)`
      );
      return { success: true };
    }

    return type === 'phone'
      ? this._sendSMS(identifier, otp)
      : this._sendEmail(identifier, otp);
  }

  async _sendSMS(phone, otp) {
    const cfg = OTP_CONFIG.sms;
    try {
      if (cfg.provider === 'fast2sms') {
        const res  = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method:  'POST',
          headers: { authorization: cfg.fast2smsApiKey, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ route: 'otp', variables_values: otp, numbers: phone }),
        });
        const data = await res.json();
        return { success: data.return === true, error: data.message };
      }
      if (cfg.provider === 'msg91') {
        const res  = await fetch(
          `https://control.msg91.com/api/v5/otp?authkey=${cfg.msg91AuthKey}&mobile=91${phone}&template_id=${cfg.msg91TemplateId}`,
          { method: 'POST' }
        );
        const data = await res.json();
        return { success: data.type === 'success', error: data.message };
      }
      if (cfg.provider === 'twilio') {
        // Twilio Verify requires a server-side proxy; implement your proxy endpoint here.
        return { success: false, error: 'Twilio requires a server-side proxy. See otp-service.js.' };
      }
      return { success: false, error: 'SMS provider not configured in OTP_CONFIG.' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async _sendEmail(email, otp) {
    if (!window.emailjs)
      return { success: false, error: 'EmailJS SDK not loaded. Add the EmailJS CDN script to <head>.' };
    const cfg = OTP_CONFIG.email;
    try {
      await window.emailjs.send(
        cfg.serviceId, cfg.templateId,
        { to_email: email, otp_code: otp, expiry_minutes: 10, from_name: cfg.fromName },
        cfg.publicKey
      );
      return { success: true };
    } catch (e) { return { success: false, error: e.message || 'Failed to send email OTP.' }; }
  }

  /** Verify the OTP entered by the user */
  verify(identifier, type, entered) {
    const key    = this._key(identifier, type);
    const record = this._state[key];
    if (!record)
      return { success: false, error: 'No OTP found for this number/email. Please request a new one.' };
    if (Date.now() > record.expiry) {
      delete this._state[key]; this._saveState();
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }
    if (record.attempts >= OTP_CONFIG.maxAttempts)
      return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' };

    record.attempts++;
    if (entered.trim() !== record.otp) {
      this._saveState();
      const left = OTP_CONFIG.maxAttempts - record.attempts;
      return { success: false, error: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` };
    }
    record.verified = true;
    this._saveState();
    return { success: true };
  }

  /** Returns true if the identifier has been verified and the session is still valid */
  isVerified(identifier, type) {
    const r = this._state[this._key(identifier, type)];
    return !!(r && r.verified && Date.now() <= r.expiry);
  }

  /** Reset/invalidate verification for an identifier */
  reset(identifier, type) {
    delete this._state[this._key(identifier, type)];
    this._saveState();
  }
}

// Global singleton
const otpService = new OTPService();


// ─────────────────────────────────────────────
//  Generic UI helpers (data-attribute-driven)
// ─────────────────────────────────────────────

/** Walk up DOM to find .otp-group ancestor */
function _otpGroup(el) { return el.closest('.otp-group'); }

/** Set a status message inside an OTP group */
function _otpMsg(group, text, kind /* 'error' | 'info' | '' */) {
  const el = group.querySelector('.otp-msg');
  if (!el) return;
  el.textContent = text;
  el.className   = kind ? `otp-msg otp-msg-${kind}` : 'otp-msg';
}

/** Start a countdown timer display inside an OTP group */
function _otpTimer(group) {
  const el  = group.querySelector('.otp-timer');
  if (!el) return;
  let secs  = Math.floor(OTP_CONFIG.expiryMs / 1000);
  const run = () => {
    if (secs < 0) { el.textContent = 'OTP expired — request a new one.'; return; }
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    el.textContent = `OTP expires in ${m}:${s}`;
    secs--;
    setTimeout(run, 1000);
  };
  run();
}

/** Validate phone or email format */
function _otpValidate(value, type) {
  if (type === 'phone') {
    if (!value)                                       return 'Please enter your phone number first.';
    if (!/^[6-9]\d{9}$/.test(value.replace(/[\s-]/g, '')))
                                                      return 'Enter a valid 10-digit Indian mobile number.';
  } else {
    if (!value)                                       return 'Please enter your email address first.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))   return 'Enter a valid email address.';
  }
  return null;
}

/**
 * Enable/disable the submit button of the parent form.
 * The button must carry the [data-otp-submit] attribute.
 * All .otp-group[data-required="true"] inside the form must be verified.
 */
function _otpRefreshSubmit(form) {
  if (!form) return;
  const btn      = form.querySelector('[data-otp-submit]');
  if (!btn) return;
  const groups   = [...form.querySelectorAll('.otp-group[data-required="true"]')];
  const allDone  = groups.every(g => {
    const id = g.querySelector('input[data-otp-target="identifier"]');
    return id && otpService.isVerified(id.value.trim(), g.dataset.type);
  });
  btn.disabled = !allDone;
}

// ── "Send OTP" click ──────────────────────────
async function _otpOnSend(btn) {
  const group = _otpGroup(btn);
  if (!group) return;
  const type  = group.dataset.type;
  const input = group.querySelector('input[data-otp-target="identifier"]');
  const value = input ? input.value.trim() : '';

  const err = _otpValidate(value, type);
  if (err) { _otpMsg(group, err, 'error'); input && input.focus(); return; }

  btn.disabled    = true;
  btn.textContent = 'Sending…';
  _otpMsg(group, '', '');

  const result = await otpService.sendOTP(value, type);

  if (result.success) {
    const row = group.querySelector('.otp-verify-row');
    if (row) row.classList.add('show');
    const codeInput = group.querySelector('.otp-code-input');
    if (codeInput) { codeInput.value = ''; codeInput.focus(); }
    _otpMsg(group, 'Enter the 6-digit OTP sent to ' + value + '.', 'info');
    _otpTimer(group);
    btn.textContent = 'Resend OTP';
    btn.disabled    = false;
  } else {
    _otpMsg(group, result.error || 'Could not send OTP. Please try again.', 'error');
    btn.textContent = 'Send OTP';
    btn.disabled    = false;
  }
}

// ── "Verify" click ────────────────────────────
function _otpOnVerify(btn) {
  const group     = _otpGroup(btn);
  if (!group) return;
  const type      = group.dataset.type;
  const idInput   = group.querySelector('input[data-otp-target="identifier"]');
  const codeInput = group.querySelector('.otp-code-input');
  const id        = idInput   ? idInput.value.trim()   : '';
  const code      = codeInput ? codeInput.value.trim() : '';

  if (!code) { _otpMsg(group, 'Please enter the OTP.', 'error'); codeInput && codeInput.focus(); return; }

  const result = otpService.verify(id, type, code);

  if (result.success) {
    if (idInput)   idInput.readOnly = true;
    const row = group.querySelector('.otp-verify-row');
    if (row)  row.classList.remove('show');
    const sendBtn = group.querySelector('.otp-send-btn');
    if (sendBtn) sendBtn.style.display = 'none';
    const badge = group.querySelector('.otp-verified-badge');
    if (badge) badge.style.display = 'inline-flex';
    const timer = group.querySelector('.otp-timer');
    if (timer) timer.textContent = '';
    _otpMsg(group, '', '');
    _otpRefreshSubmit(group.closest('form'));
  } else {
    _otpMsg(group, result.error, 'error');
  }
}

// ── Re-edit identifier → reset verification ──
function _otpOnEdit(idInput) {
  const group = _otpGroup(idInput);
  if (!group) return;
  idInput.readOnly = false;
  const row = group.querySelector('.otp-verify-row');
  if (row) row.classList.remove('show');
  const sendBtn = group.querySelector('.otp-send-btn');
  if (sendBtn) { sendBtn.style.display = ''; sendBtn.textContent = 'Send OTP'; sendBtn.disabled = false; }
  const badge = group.querySelector('.otp-verified-badge');
  if (badge) badge.style.display = 'none';
  const codeInput = group.querySelector('.otp-code-input');
  if (codeInput) codeInput.value = '';
  const timer = group.querySelector('.otp-timer');
  if (timer) timer.textContent = '';
  _otpMsg(group, '', '');
  otpService.reset(idInput.value.trim(), group.dataset.type);
  _otpRefreshSubmit(group.closest('form'));
}

// ── Guard for form submission ─────────────────
/**
 * Call at the top of any form submit handler.
 * Returns true if all required OTPs are verified (allow submit),
 * false if not (shows error and blocks submission).
 */
function otpGuardSubmit(form) {
  const required = [...form.querySelectorAll('.otp-group[data-required="true"]')];
  for (const group of required) {
    const idInput = group.querySelector('input[data-otp-target="identifier"]');
    if (!idInput) continue;
    const val = idInput.value.trim();
    if (!otpService.isVerified(val, group.dataset.type)) {
      _otpMsg(group, `Please verify your ${group.dataset.type === 'phone' ? 'phone number' : 'email address'} before submitting.`, 'error');
      idInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
  }
  return true;
}

// ── Event delegation (single listener for entire page) ──
document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.classList.contains('otp-send-btn'))    { e.preventDefault(); _otpOnSend(btn);   }
  if (btn.classList.contains('otp-confirm-btn')) { e.preventDefault(); _otpOnVerify(btn); }
});

// Reset verification when the identifier value changes
document.addEventListener('input', function(e) {
  const inp = e.target.closest('input[data-otp-target="identifier"]');
  if (inp) {
    const group = _otpGroup(inp);
    if (!group) return;
    // If it was verified, reset when the user types something new
    if (group.querySelector('.otp-verified-badge[style*="inline-flex"]') ||
        group.querySelector('input[data-otp-target="identifier"][readonly]')) {
      _otpOnEdit(inp);
    }
  }
});

/*
 * ── SERVER-SIDE OTP VERIFICATION (recommended for production) ──────────────
 *
 * To prevent client-side bypass, create a Parse Cloud Function:
 *
 *   Parse.Cloud.define('verifyOtp', async (request) => {
 *     const { identifier, code, type } = request.params;
 *     // Look up a stored OTP in a server-side OtpVerification class
 *     // that was written when SMS/email was dispatched by your backend.
 *     const query = new Parse.Query('OtpVerification');
 *     query.equalTo('identifier', identifier);
 *     query.equalTo('code', code);
 *     query.greaterThan('expiresAt', new Date());
 *     const record = await query.first({ useMasterKey: true });
 *     if (!record) throw new Parse.Error(141, 'Invalid or expired OTP');
 *     await record.destroy({ useMasterKey: true });
 *     return { verified: true };
 *   });
 *
 * Then in otpService.verifyOtp(), call:
 *   await Parse.Cloud.run('verifyOtp', { identifier, code, type });
 * before setting verified = true in _state.
 */
