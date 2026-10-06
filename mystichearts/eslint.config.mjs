import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", ".next/dev/**", "next-env.d.ts", "node_modules/**", "out/**"],
  },
];

export default eslintConfig;
