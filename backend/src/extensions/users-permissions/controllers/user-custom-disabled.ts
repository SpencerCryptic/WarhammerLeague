'use strict';

/**
 * User controller
 */

export default {
  async me(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest('User not found');
    }
    
    const sanitizedUser = await strapi
      .plugin('users-permissions')
      .service('user')
      .sanitizeUser(user);
      
    ctx.send(sanitizedUser);
  },

  async updateProfile(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest('User not found');
    }

    const { email, firstName, lastName, phoneNumber, dateOfBirth, storeLocation } = ctx.request.body;

    // Build update data, only including fields that are provided
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (storeLocation !== undefined) updateData.storeLocation = storeLocation;

    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: updateData,
      });

      const sanitizedUser = await strapi
        .plugin('users-permissions')
        .service('user')
        .sanitizeUser(updatedUser);

      ctx.send(sanitizedUser);
    } catch (error) {
      ctx.badRequest('Failed to update profile');
    }
  },

  async count(ctx) {
    const { query } = ctx;
    const count = await strapi.entityService.count('plugin::users-permissions.user', {
      ...query,
    });
    ctx.send({ count });
  },
};