import { json, Bytes, dataSource, log } from "@graphprotocol/graph-ts";
import { RoundMetadata } from "../generated/schema";

export function handleRoundMetadata(content: Bytes): void {
  let roundMetadata = new RoundMetadata(dataSource.stringParam());
  const value = json.fromBytes(content).toObject();

  if (value) {
    const image = value.get("image");
    const name = value.get("name");
    const description = value.get("description");
    const externalURL = value.get("external_url");

    if (name) {
      roundMetadata.name = name.toString();
    }

    if (description) {
      roundMetadata.description = description.toString();
    }

    if (image) {
      roundMetadata.image = image.toString();
    }

    if (externalURL) {
      roundMetadata.external_url = externalURL.toString();
    }

    roundMetadata.save();
  }
}
