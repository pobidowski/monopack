export enum ImportMatcherTypes {
  INLINE = 'INLINE',
  IMPORT = 'IMPORT',
}

export interface ImportMatcherResponseInterface {
  type: ImportMatcherTypes;
  externalDependency?: {
    context: string;
    packageName: string;
  };
}

export const importMatcher = (
  request: string,
  context: string,
  inputFile: string,
  monorepoPackages: string[],
): ImportMatcherResponseInterface => {
  if (
    request === inputFile ||
    request.startsWith('.') ||
    monorepoPackages.includes(request)
  ) {
    return { type: ImportMatcherTypes.INLINE };
  }

  return {
    type: ImportMatcherTypes.IMPORT,
    externalDependency: { context, packageName: request },
  };
};
