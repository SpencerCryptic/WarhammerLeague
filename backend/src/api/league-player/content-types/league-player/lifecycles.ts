export default {
  beforeCreate(event: any) {
    const { data } = event.params;

    console.log('🔍 LeaguePlayer beforeCreate - status:', data.status);

    // Set default status to 'active' if not provided or empty
    if (!data.status || data.status === '' || data.status === null || data.status === undefined) {
      console.log('✅ Setting status to active in beforeCreate');
      data.status = 'active';
    }
  },

  beforeUpdate(event: any) {
    const { data } = event.params;

    console.log('🔍 LeaguePlayer beforeUpdate - status:', data.status);
    console.log('🔍 LeaguePlayer beforeUpdate - data keys:', Object.keys(data));

    // If status is being updated but is empty/null/undefined, set to 'active'
    // If status is not in the update data at all, don't touch it
    if (data.hasOwnProperty('status')) {
      if (!data.status || data.status === '' || data.status === null || data.status === undefined) {
        console.log('✅ Setting empty status to active in beforeUpdate');
        data.status = 'active';
      }
    }
  },
};
