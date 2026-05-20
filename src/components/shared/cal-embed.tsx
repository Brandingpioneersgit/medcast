export function CalEmbed({ calUrl }: { calUrl: string }) {
  const m = calUrl.match(/cal\.com\/([^/]+\/[^/?#]+)/);
  const namespace = m ? m[1] : calUrl;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <iframe
        src={`https://cal.com/${namespace}?embed=true&theme=light&brandColor=0d9488`}
        width="100%"
        height="680"
        frameBorder="0"
        title="Book appointment"
      />
    </div>
  );
}
