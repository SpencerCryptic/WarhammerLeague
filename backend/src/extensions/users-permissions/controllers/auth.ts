import { validateUsername } from '../../../utils/profanity-filter';

export default (plugin) => {
  const originalRegister = plugin.controllers.auth.register;
  
  plugin.controllers.auth.register = async (ctx) => {
    const { username, email, password } = ctx.request.body;
    
    // Validate username for profanity
    if (username) {
      const usernameValidation = await validateUsername(username);
      if (!usernameValidation.isValid) {
        return ctx.badRequest(usernameValidation.message);
      }
    }
    
    // Call the original register function
    return originalRegister(ctx);
  };
  
  return plugin;
};