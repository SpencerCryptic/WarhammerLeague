export default {
  // Full profile update during registration (all fields allowed)
  async update(ctx) {
    console.log('Full profile update request received (registration)');
    console.log('Request body:', ctx.request.body);
    
    const { userId, firstName, lastName, phoneNumber, dateOfBirth, storeLocation } = ctx.request.body;
    
    if (!userId) {
      return ctx.badRequest('User ID is required');
    }

    try {
      const updatedUser = await strapi.entityService.update(
        'plugin::users-permissions.user',
        userId,
        {
          data: {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            storeLocation,
          },
        }
      );

      return ctx.send({ user: updatedUser });
    } catch (error) {
      console.error('Profile update error:', error);
      return ctx.badRequest('Failed to update profile');
    }
  },

  // Limited profile update after registration (only certain fields allowed)
  async updateLimited(ctx) {
    console.log('Limited profile update request received');
    console.log('Request body:', ctx.request.body);
    
    const { userId, email, phoneNumber, storeLocation } = ctx.request.body;
    
    if (!userId) {
      return ctx.badRequest('User ID is required');
    }

    // Only allow updating specific fields after registration
    const allowedFields: any = {};
    if (email) allowedFields.email = email;
    if (phoneNumber) allowedFields.phoneNumber = phoneNumber;
    if (storeLocation) allowedFields.storeLocation = storeLocation;

    try {
      const updatedUser = await strapi.entityService.update(
        'plugin::users-permissions.user',
        userId,
        {
          data: allowedFields,
        }
      );

      return ctx.send({ user: updatedUser });
    } catch (error) {
      console.error('Profile update error:', error);
      return ctx.badRequest('Failed to update profile');
    }
  },
};