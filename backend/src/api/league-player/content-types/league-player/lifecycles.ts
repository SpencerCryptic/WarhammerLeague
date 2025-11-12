export default {
  beforeCreate(event) {
    const { data } = event.params;

    // Set default status to 'active' if not provided
    if (!data.status) {
      data.status = 'active';
    }
  },

  beforeUpdate(event) {
    const { data } = event.params;

    // Only set default status if the update doesn't include a status value
    // This ensures we don't override status when it's explicitly being set to something else
    if (data.hasOwnProperty('status') && !data.status) {
      data.status = 'active';
    }
  },
};
