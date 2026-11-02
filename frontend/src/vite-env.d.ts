/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />


declare module "*.png";
declare module "*.svg";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.mp4";

declare module "figma:asset/*" {
    const content: string;
    export default content;
}
