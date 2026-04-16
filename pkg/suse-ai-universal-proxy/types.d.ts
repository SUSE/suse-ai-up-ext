declare module '*.svg' {
  const content: any;
  export default content;
}

declare module '@shell/*' {
  const shellComponent: any
  export default shellComponent
}

declare module '@components/*' {
  const componentsComponent: any
  export default componentsComponent
}