import { display, label } from "@/sdk/format";
import { useId, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/common/Notice";
import { type Row } from "@/types/assistant";
import { ReportRecordImage } from "./ReportRecordImage";
import { reportColumns, reportMoney } from "./reportPresentation";
import { Badge } from "@/components/ui/badge";

export const BusinessSelect = ({
  id,
  value,
  onChange,
  options,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) => {
  const controlId = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={controlId} className="text-sm font-medium">
        {id}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={controlId} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
export const BusinessDataTable = ({
  rows,
  columns,
  empty = "No records in this period.",
  timezone,
}: {
  rows: Row[];
  columns?: string[];
  empty?: string;
  timezone?: string;
}) => {
  const fields = columns || reportColumns(rows);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        {!rows.length && <TableCaption className="pb-4">{empty}</TableCaption>}
        <TableHeader>
          <TableRow>
            {fields.map((field) => (
              <TableHead
                key={field}
                className={
                  ["total", "quantity", "unit_price", "late_minutes"].includes(field)
                    ? "text-right"
                    : ""
                }
              >
                {label(field)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {fields.map((field) => (
                <TableCell
                  className={`max-w-sm whitespace-normal break-words py-3 ${["total", "quantity", "unit_price", "late_minutes"].includes(field) ? "text-right tabular-nums" : ""}`}
                  key={field}
                >
                  {["product", "employee"].includes(field) ||
                  (field === "order" && !fields.includes("product")) ? (
                    <span className="flex min-w-40 items-center gap-3">
                      <ReportRecordImage
                        source={row.image_url || row.image || row.thumbnail}
                        kind={field}
                      />
                      <span className="font-medium">{display(row[field])}</span>
                    </span>
                  ) : ["status", "payment"].includes(field) ? (
                    <Badge
                      variant="secondary"
                      className={
                        row[field] === "paid" || row[field] === "fulfilled"
                          ? "smokey-status-ready"
                          : ""
                      }
                    >
                      {label(String(row[field] || "Unknown"))}
                    </Badge>
                  ) : ["total", "unit_price"].includes(field) && row.currency ? (
                    reportMoney(row[field], row.currency)
                  ) : ["date", "clock_in", "clock_out"].includes(field) &&
                    row[field] &&
                    !Number.isNaN(Date.parse(String(row[field]))) ? (
                    new Date(String(row[field])).toLocaleString(undefined, { timeZone: timezone })
                  ) : (
                    display(row[field])
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
export const BusinessDelete = ({
  open,
  onOpenChange,
  title,
  children,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  busy: boolean;
  error?: string;
}) => (
  <AlertDialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{children}</AlertDialogDescription>
      </AlertDialogHeader>
      <Notice message={error || ""} error />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
        <Button variant="destructive" disabled={busy} onClick={onConfirm}>
          Delete
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
