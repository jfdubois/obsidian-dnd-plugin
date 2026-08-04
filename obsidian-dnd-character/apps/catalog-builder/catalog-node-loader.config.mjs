// The workspace's TypeScript build uses extensionless ESM specifiers. This
// loader is intentionally limited to the local smoke-publishing CLI.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !specifier.endsWith(".js")) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw error;
  }
}
