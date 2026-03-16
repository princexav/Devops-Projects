import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function LabResultsPage() {
  const { data: results = [] } = useQuery({
    queryKey: ["labResults"],
    queryFn: api.getLabResults,
  });

  const categories = [...new Set(results.map((r) => r.category))];
  const abnormalCount = results.filter((r) => r.status === "abnormal").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lab Results</h2>
        <p className="text-muted-foreground">
          View your laboratory test results and reference ranges.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {results.filter((r) => r.status === "normal").length}
              </p>
              <p className="text-sm text-muted-foreground">Normal Results</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{abnormalCount}</p>
              <p className="text-sm text-muted-foreground">Need Attention</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Test Results
          </CardTitle>
          <CardDescription>
            Grouped by category. Click a result for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={categories[0]}>
            <TabsList className="flex-wrap">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat} value={cat} className="space-y-3 pt-4">
                {results
                  .filter((r) => r.category === cat)
                  .map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {result.status === "normal" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : result.status === "pending" ? (
                          <Clock className="h-5 w-5 text-amber-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium">{result.testName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatDate(result.date)}</span>
                          <span>&middot;</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {result.orderedBy}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {result.status !== "pending" ? (
                          <>
                            <p className="font-mono text-sm font-semibold">
                              {result.value} {result.unit}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ref: {result.referenceRange}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Awaiting results
                          </p>
                        )}
                      </div>

                      <Badge
                        variant={
                          result.status === "normal"
                            ? "success"
                            : result.status === "pending"
                              ? "warning"
                              : "destructive"
                        }
                        className="capitalize"
                      >
                        {result.status}
                      </Badge>
                    </div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
