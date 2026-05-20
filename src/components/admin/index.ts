// Public exports for the admin component library.
// Internal admin pages should import from "@/components/admin" rather than
// reaching into specific files; this lets us refactor internals without
// breaking call sites.

export { AdminSidebar } from "./sidebar";
export { AdminPageHeader, StatRibbon, type Crumb } from "./page-header";
export { Breadcrumb } from "./breadcrumb";
export { EmptyState } from "./empty-state";
export { DataTable, type Column, type FilterDef } from "./data-table";
export { ToastProvider, useToast, toast } from "./toast";
export { ConfirmDialogProvider, confirm } from "./confirm-dialog";
export {
  Field,
  FieldLabel,
  FieldError,
  TextInput,
  Textarea,
  SlugInput,
  CharCounter,
  ImagePreview,
  useUnsavedChangesWarning,
  slugify,
} from "./form-helpers";
export {
  Badge,
  StatusBadge,
  FeaturedBadge,
  VerifiedBadge,
  TranslationBadge,
  SeverityBadge,
  TimeAgoBadge,
  type BadgeTone,
} from "./badges";
export { QuickStatusMenu } from "./quick-status";
export { NotesPanel } from "./notes-panel";
export { ArchiveButton } from "./archive-button";
export { SchedulePicker } from "./schedule-picker";
export { AdminPagination } from "./pagination";
export { InlineToggle } from "./inline-toggle";
export { ConflictDialog } from "./conflict-dialog";
export { HealthWidget } from "./health-widget";
