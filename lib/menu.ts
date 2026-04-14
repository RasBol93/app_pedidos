import type { MenuItem } from "@/types/webapp";

export function getActiveMenu(menu: MenuItem[]) {
  return menu.filter((item) => item.active);
}

export function groupMenuByCategory(menu: MenuItem[]) {
  return getActiveMenu(menu).reduce<Record<string, MenuItem[]>>((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push(item);
    return groups;
  }, {});
}
