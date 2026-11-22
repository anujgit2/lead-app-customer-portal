// CloudFront Function (viewer-request) for the S3 static export origin.
//
// next.config.ts uses `trailingSlash: true`, so `next build` exports every
// route as a directory with an index file, e.g. `/auth/login/index.html`.
// The S3 origin is fronted by an Origin Access Control (not a website
// endpoint), so it only ever returns the exact object key that was
// requested — it will not resolve "folders" to their index.html the way
// S3 static website hosting does. Without this rewrite, requests like
// `/auth/login` or `/auth/login/` come back as 403 AccessDenied instead of
// the page.
//
// This function normalizes the request URI before it reaches the origin:
//   /                 -> /index.html            (belt-and-suspenders; also covered by DefaultRootObject)
//   /auth/login/      -> /auth/login/index.html
//   /auth/login       -> /auth/login/index.html
//   /_next/static/x.js -> unchanged (has a file extension)
//
// Dynamic routes (`[id]`, `[token]`, `[tenant]`) are exported once as a shell
// page, e.g. `/documents/view/index.html`, which reads the real id from the URL
// in the browser. A hard load of `/documents/<uuid>/` therefore has to be sent
// to that shell; otherwise S3 answers 403 AccessDenied for the missing key.
// Known static children of each prefix are left alone.
//
// Deploy/update with:
//   aws cloudfront update-function  --name lead-portal-ui-index-rewrite --function-config Comment="...",Runtime=cloudfront-js-2.0 --function-code fileb://infra/cloudfront/index-rewrite.js --if-match <ETag>
//   aws cloudfront test-function    --name lead-portal-ui-index-rewrite --if-match <ETag> --stage DEVELOPMENT --event-object fileb://event.json
//   aws cloudfront publish-function --name lead-portal-ui-index-rewrite --if-match <ETag>
// and associate it as a viewer-request function on the default cache behavior.
var DYNAMIC_ROUTES = [
  { prefix: "documents", shell: "/documents/view/index.html", known: ["view", "dashboard"] },
  { prefix: "profiles", shell: "/profiles/view/index.html", known: ["view", "new"] },
  { prefix: "s", shell: "/s/link/index.html", known: ["link"] },
  { prefix: "shared", shell: "/shared/link/index.html", known: ["link"] },
  { prefix: "t", shell: "/t/site/index.html", known: ["site"] },
];

function dynamicShell(uri) {
  for (var i = 0; i < DYNAMIC_ROUTES.length; i++) {
    var route = DYNAMIC_ROUTES[i];
    var match = uri.match(new RegExp("^/" + route.prefix + "/([^/]+)/?$"));
    if (match && route.known.indexOf(match[1]) === -1) {
      return route.shell;
    }
  }
  return null;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  var shell = dynamicShell(uri);
  if (shell) {
    request.uri = shell;
    return request;
  }

  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.includes(".")) {
    request.uri += "/index.html";
  }

  return request;
}
