/*
 * GrowTogether - Parse/Back4App Data Service
 * Replaces localStorage with cloud database
 */

// Initialize Parse
Parse.initialize(BACK4APP_CONFIG.APP_ID, BACK4APP_CONFIG.JS_KEY);
Parse.serverURL = BACK4APP_CONFIG.SERVER_URL;

const Enquiry = Parse.Object.extend('Enquiry');
const SiteSettings = Parse.Object.extend('SiteSettings');

const ParseService = {

  // ─── SITE SETTINGS ─────────────────────────────────────

  async getSetting(key) {
    try {
      const query = new Parse.Query(SiteSettings);
      query.equalTo('key', key);
      const result = await query.first();
      return result ? result.get('value') : null;
    } catch (error) {
      console.error('Error getting setting:', error);
      return null;
    }
  },

  async setSetting(key, value) {
    try {
      const query = new Parse.Query(SiteSettings);
      query.equalTo('key', key);
      let obj = await query.first();
      if (!obj) { obj = new SiteSettings(); obj.set('key', key); }
      obj.set('value', value);
      await obj.save();
      return { success: true };
    } catch (error) {
      console.error('Error saving setting:', error);
      return { success: false, error };
    }
  },

  // ─── CREATE ────────────────────────────────────────────

  async createEnquiry(data) {
    const enquiry = new Enquiry();

    // Common fields
    enquiry.set('type', data.type);
    enquiry.set('status', data.status || 'pending');
    enquiry.set('name', data.name || '');
    enquiry.set('phone', data.phone || '');

    if (data.type === 'grow') {
      enquiry.set('email', data.email || '');
      enquiry.set('crop', data.crop || '');
      enquiry.set('acres', data.acres || '');
      enquiry.set('preferredLand', data.preferredLand || '');
      enquiry.set('preferredVariety', data.preferredVariety || '');
      enquiry.set('preferredSeason', data.preferredSeason || '');
      enquiry.set('estimatedInvestment', data.estimatedInvestment || '');
      enquiry.set('notes', data.notes || '');
    } else if (data.type === 'lease') {
      enquiry.set('village', data.village || '');
      enquiry.set('acreage', data.acreage || '');
      enquiry.set('soilType', data.soilType || '');
      enquiry.set('irrigationSource', data.irrigationSource || '');
      enquiry.set('details', data.details || '');
    } else if (data.type === 'farmer_application') {
      enquiry.set('name', data.fullName || data.name || '');
      enquiry.set('village', data.village || '');
      enquiry.set('experience', data.experience || '');
      enquiry.set('crops', data.crops || '');
      enquiry.set('farmingType', data.farmingType || '');
      enquiry.set('land', data.land || '');
      enquiry.set('idType', data.idType || '');
      enquiry.set('idNumber', data.idNumber || '');
      enquiry.set('bio', data.bio || '');
    }

    try {
      const result = await enquiry.save();
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Error saving enquiry:', error);
      // Fallback to localStorage
      saveFallback(data);
      return { success: true, id: Date.now().toString(36), fallback: true };
    }
  },

  // ─── READ ──────────────────────────────────────────────

  async getEnquiries(filters = {}) {
    const query = new Parse.Query(Enquiry);
    query.descending('createdAt');
    query.limit(1000);

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      query.equalTo('type', filters.type);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.equalTo('status', filters.status);
    }

    // Apply search
    if (filters.search) {
      const nameQuery = new Parse.Query(Enquiry);
      nameQuery.matches('name', new RegExp(filters.search, 'i'));
      const phoneQuery = new Parse.Query(Enquiry);
      phoneQuery.matches('phone', new RegExp(filters.search, 'i'));
      const cropQuery = new Parse.Query(Enquiry);
      cropQuery.matches('crop', new RegExp(filters.search, 'i'));
      const villageQuery = new Parse.Query(Enquiry);
      villageQuery.matches('village', new RegExp(filters.search, 'i'));

      const compoundQuery = Parse.Query.or(nameQuery, phoneQuery, cropQuery, villageQuery);
      compoundQuery.descending('createdAt');
      compoundQuery.limit(1000);

      // Apply type/status to compound query too
      if (filters.type && filters.type !== 'all') {
        compoundQuery.equalTo('type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        compoundQuery.equalTo('status', filters.status);
      }

      try {
        const results = await compoundQuery.find();
        return results.map(parseObjectToData);
      } catch (error) {
        console.error('Error fetching enquiries:', error);
        return getFallback();
      }
    }

    try {
      const results = await query.find();
      return results.map(parseObjectToData);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      return getFallback();
    }
  },

  // ─── UPDATE STATUS ─────────────────────────────────────

  async updateEnquiryStatus(id, status) {
    const query = new Parse.Query(Enquiry);
    try {
      const enquiry = await query.get(id);
      enquiry.set('status', status);
      await enquiry.save();
      return { success: true };
    } catch (error) {
      console.error('Error updating status:', error);
      return { success: false, error };
    }
  },

  // ─── DELETE ────────────────────────────────────────────

  async deleteEnquiry(id) {
    const query = new Parse.Query(Enquiry);
    try {
      const enquiry = await query.get(id);
      await enquiry.destroy();
      return { success: true };
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      return { success: false, error };
    }
  },

  // ─── STATS ─────────────────────────────────────────────

  async getStats() {
    try {
      const allQuery = new Parse.Query(Enquiry);
      const total = await allQuery.count();

      const pendingQuery = new Parse.Query(Enquiry);
      pendingQuery.equalTo('status', 'pending');
      const pending = await pendingQuery.count();

      const growQuery = new Parse.Query(Enquiry);
      growQuery.equalTo('type', 'grow');
      const growCount = await growQuery.count();

      const leaseQuery = new Parse.Query(Enquiry);
      leaseQuery.equalTo('type', 'lease');
      const leaseCount = await leaseQuery.count();

      return { total, pending, growCount, leaseCount };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, pending: 0, growCount: 0, leaseCount: 0 };
    }
  }
};

// ─── HELPERS ───────────────────────────────────────────────

function parseObjectToData(obj) {
  return {
    id: obj.id,
    type: obj.get('type'),
    status: obj.get('status'),
    name: obj.get('name'),
    phone: obj.get('phone'),
    email: obj.get('email'),
    crop: obj.get('crop'),
    acres: obj.get('acres'),
    preferredLand: obj.get('preferredLand'),
    preferredVariety: obj.get('preferredVariety'),
    preferredSeason: obj.get('preferredSeason'),
    estimatedInvestment: obj.get('estimatedInvestment'),
    notes: obj.get('notes'),
    village: obj.get('village'),
    acreage: obj.get('acreage'),
    soilType: obj.get('soilType'),
    irrigationSource: obj.get('irrigationSource'),
    details: obj.get('details'),
    timestamp: obj.get('createdAt').toISOString()
  };
}

// ─── LOCALSTORAGE FALLBACK ─────────────────────────────────
// Used when Back4App is unreachable

function saveFallback(data) {
  const existing = JSON.parse(localStorage.getItem('gt_enquiries') || '[]');
  data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  data.timestamp = new Date().toISOString();
  existing.push(data);
  localStorage.setItem('gt_enquiries', JSON.stringify(existing));
}

function getFallback() {
  return JSON.parse(localStorage.getItem('gt_enquiries') || '[]');
}
