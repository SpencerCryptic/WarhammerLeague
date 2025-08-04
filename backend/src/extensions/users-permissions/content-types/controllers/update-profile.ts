export default {
  async me(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized("No authenticated user");
    }

    try {
      const user = await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: userId,
        populate: ['role', 'player'],
      });

      if (!user) {
        return ctx.notFound("User not found");
      }

      // Remove sensitive fields
      const { password, resetPasswordToken, confirmationToken, ...safeUser } = user;
      
      return ctx.send({ user: safeUser });
    } catch (err) {
      console.error("Get user error", err);
      return ctx.internalServerError("Failed to fetch user data");
    }
  },

  async updateProfile(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized("You must be logged in.");

    const allowedFields = [
      'username',
      'email',
      'phoneNumber', 
      'firstName',   
      'lastName',    
      'dateOfBirth', 
      'storeLocation',
      'role'
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (ctx.request.body[key] !== undefined) {
        updates[key] = ctx.request.body[key];
      }
    }

    try {
      const updated = await strapi.documents('plugin::users-permissions.user').update({
        documentId: userId,
        data: updates,
        populate: ['role', 'player'], 
      });

 
      const { password, resetPasswordToken, confirmationToken, ...safeUser } = updated;

      return ctx.send({ user: safeUser });
    } catch (err) {
      console.error("Profile update error", err);
      return ctx.internalServerError("Failed to update profile.");
    }
  },
};