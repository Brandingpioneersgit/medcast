import { HeaderClient } from "./header-client";
import { getNavData } from "./nav-data";

export async function Header() {
  const nav = await getNavData();
  return <HeaderClient nav={nav} />;
}
