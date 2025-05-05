export default {
    async updateProfile(ctx) {
      const userId = ctx.state.user?.id;
      if (!userId) return ctx.unauthorized("You must be logged in.");
  
      const allowedFields = [
        'username',
        'email',
        'phone_number',
        'first_name',
        'last_name',
        'date_of_birth',
        'store'
      ];
  
      const updates = {};
      for (const key of allowedFields) {
        if (ctx.request.body[key] !== undefined) {
          updates[key] = ctx.request.body[key];
        }
      }
  
      try {
        const updated = await strapi.entityService.update('plugin::users-permissions.user', userId, {
          data: updates,
        });
  
        return ctx.send({ user: updated });
      } catch (err) {
        console.error("Profile update error", err);
        return ctx.internalServerError("Failed to update profile.");
      }
    },
  };
  