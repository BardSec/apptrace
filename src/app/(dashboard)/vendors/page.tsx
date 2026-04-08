import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, Minus } from "lucide-react";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function complianceBadge(value: boolean | null, label: string) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      <Minus className="h-3 w-3" />
      {label}
    </span>
  );
}

export default async function VendorsPage() {
  const vendors = await prisma.vendor.findMany({
    include: {
      webApps: {
        select: {
          id: true,
          totalObservations: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const vendorRows = vendors.map((vendor) => ({
    ...vendor,
    appCount: vendor.webApps.length,
    totalObservations: vendor.webApps.reduce(
      (sum, app) => sum + app.totalObservations,
      0
    ),
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
        <p className="mt-1 text-sm text-slate-500">
          Application vendors and their data practices.
        </p>
      </div>

      <p className="mb-3 text-sm text-slate-500">
        {formatNumber(vendorRows.length)} vendor
        {vendorRows.length !== 1 ? "s" : ""} tracked
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-medium text-slate-600">Vendor</th>
              <th className="px-4 py-3 font-medium text-slate-600">Country</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Apps
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Compliance
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Privacy Policy
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Total Observations
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendorRows.map((vendor) => (
              <tr
                key={vendor.id}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">
                    {vendor.name}
                  </span>
                  {vendor.website && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {vendor.website}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {vendor.headquartersCountry ?? (
                    <span className="text-slate-400">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {vendor.appCount}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {complianceBadge(vendor.coppaCompliant, "COPPA")}
                    {complianceBadge(vendor.ferpaCompliant, "FERPA")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {vendor.hasStudentPrivacyPolicy ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-300" />
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatNumber(vendor.totalObservations)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendorRows.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            No vendors found.
          </p>
        )}
      </div>
    </div>
  );
}
