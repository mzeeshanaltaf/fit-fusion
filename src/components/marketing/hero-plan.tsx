import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SAMPLE_WORKOUT } from "@/components/marketing/sample-data";

/** The hero artifact: a real library workout laid out as the plan sheet. */
export function HeroPlan() {
  const w = SAMPLE_WORKOUT;
  return (
    <figure className="surface-ink border border-border p-5 sm:p-6">
      <figcaption className="mb-4 grid gap-1">
        <span className="t-label text-muted-foreground">
          Sample plan / workout 2 of 4
        </span>
        <span className="t-heading">{w.name}</span>
        <span className="t-small text-muted-foreground">
          {w.minutes} min / {w.equipment}
        </span>
      </figcaption>

      <Table density="compact" aria-label={`${w.name}: exercises, sets, reps and rest`}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Exercise</TableHead>
            <TableHead numeric>Sets</TableHead>
            <TableHead numeric>Reps</TableHead>
            <TableHead numeric>Rest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {w.exercises.map((e, i) => (
            <TableRow
              key={e.name}
              className="row-in hover:bg-transparent"
              style={{ "--i": i } as React.CSSProperties}
            >
              <TableCell className="font-semibold">{e.name}</TableCell>
              <TableCell numeric>{e.sets}</TableCell>
              <TableCell numeric>{e.reps}</TableCell>
              <TableCell numeric>{e.rest} s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </figure>
  );
}
