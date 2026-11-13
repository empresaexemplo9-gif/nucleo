import {
  Boxes, Briefcase, Building, CalendarClock, Car, ClipboardList, FileCheck, FileSignature, FileText, Folder, FolderKanban, GraduationCap,
  HardHat, Hammer, HeartPulse, IdCard, Landmark, LifeBuoy, Package, PawPrint, Receipt, Scale, ShieldCheck, ShoppingCart, Sprout, Stethoscope,
  Store, Tag, Tractor, Truck, Users, Utensils, Wallet, Warehouse, Wrench, type LucideIcon,
} from "lucide-react";

/** Ícones disponíveis para módulos personalizados. */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  folder: Folder, "folder-kanban": FolderKanban, "clipboard-list": ClipboardList, wrench: Wrench, hammer: Hammer, "hard-hat": HardHat,
  "life-buoy": LifeBuoy, boxes: Boxes, package: Package, warehouse: Warehouse, "shopping-cart": ShoppingCart, store: Store, receipt: Receipt,
  wallet: Wallet, landmark: Landmark, "file-signature": FileSignature, "file-check": FileCheck, "file-text": FileText, scale: Scale,
  truck: Truck, car: Car, tractor: Tractor, sprout: Sprout, "paw-print": PawPrint, stethoscope: Stethoscope, "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap, "id-card": IdCard, users: Users, briefcase: Briefcase, building: Building, "calendar-clock": CalendarClock,
  "shield-check": ShieldCheck, tag: Tag, utensils: Utensils,
};

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const I = MODULE_ICONS[name] ?? Folder;
  return <I className={className} />;
}
