export default {
    async afterCreate(event, { strapi }) {
      const { result } = event;
      if (!result || !result.id) return;
  
      const existingPlayer = await strapi.entityService.findMany('api::player.player', {
        filters: { user: { id: result.id } },
      });
  
      if (existingPlayer?.length > 0) return;
  
      await strapi.entityService.create('api::player.player', {
        data: {
          name: result.username || 'Unnamed Player',
          email: result.email,
          user: result.id,
          ranking: 0,
          faction: 'Unknown',
        },
      });
    },
  };
  