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
// Deploy/update with:
//   aws cloudfront create-function  --name <name> --function-config Comment="",Runtime=cloudfront-js-2.0 --function-code fileb://infra/cloudfront/index-rewrite.js
//   aws cloudfront publish-function --name <name> --if-match <ETag>
// and associate it as a viewer-request function on the default cache behavior.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.includes(".")) {
    request.uri += "/index.html";
  }

  return request;
}
