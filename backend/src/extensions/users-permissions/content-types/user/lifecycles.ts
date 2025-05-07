export default {
    async afterCreate(event) {
      const { result } = event;
  
      // Create and link a Player entry to this User
      await strapi.entityService.create('api::player.player', {
        data: {
          name: result.username,
          email: result.email,
          user: result.id,
        },
      });
    },
  };
  