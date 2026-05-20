export function ThemeScript() {
  // Editorial design has no auto dark mode. Only respect an explicit user choice.
  const script = `
try {
  var m = localStorage.getItem('mc-theme');
  if (m === 'dark') document.documentElement.classList.add('dark');
} catch(e) {}
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
