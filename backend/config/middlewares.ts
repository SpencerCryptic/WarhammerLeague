export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',

  {
    name: 'global::sanitize-null-password',
    config: {},
  },

  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];