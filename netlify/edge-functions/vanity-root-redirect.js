export default async (request, context) => {
  const host = (request.headers.get("host") || "").toLowerCase();

  if (host === "gofundme.handprotocol.org") {
    return Response.redirect("https://www.gofundme.com/f/help-hand-protocol-grow", 301);
  }

  if (host === "giveth.handprotocol.org") {
    return Response.redirect("https://giveth.io/project/handprotocol", 301);
  }

  return context.next();
};

export const config = {
  path: "/",
};
