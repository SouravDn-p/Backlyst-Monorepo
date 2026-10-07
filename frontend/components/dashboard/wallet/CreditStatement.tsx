"use client";

import { Button } from "@/components/ui/Button";
import { useGetCreditStatementQuery } from "@/redux/features/api/credit/creditApi";
import { CreditStatementTransaction } from "@/types/credit/creditTypes";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileDown,
  ListRestart,
} from "lucide-react";
import { useState } from "react";

type StatementTab = "ALL" | "PAYMENTS" | "RECEIVED" | "REFUNDS";

const ITEMS_PER_PAGE = 12;

const STATEMENT_TABS: StatementTab[] = [
  "ALL",
  "PAYMENTS",
  "RECEIVED",
  "REFUNDS",
];

const getStatementRows = (
  response: ReturnType<typeof useGetCreditStatementQuery>["data"],
): CreditStatementTransaction[] => {
  if (Array.isArray(response?.items)) return response.items;

  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  return payload?.data ?? payload?.items ?? [];
};

const getStatementMeta = (
  response: ReturnType<typeof useGetCreditStatementQuery>["data"],
) => {
  if (response?.meta) return response.meta;

  const payload = response?.data;

  if (!Array.isArray(payload)) return payload?.meta;
  return undefined;
};

const getTransactionAmount = (transaction: CreditStatementTransaction) => {
  return Number(
    transaction.amount ?? transaction.credits ?? transaction.creditAmount ?? 0,
  );
};

const getTransactionDate = (transaction: CreditStatementTransaction) => {
  const value =
    transaction.date ?? transaction.timestamp ?? transaction.createdAt;

  if (!value) return "-";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTransactionStatus = (transaction: CreditStatementTransaction) => {
  return (
    transaction.status ??
    transaction.action ??
    transaction.reason ??
    "COMPLETED"
  )
    .replaceAll("_", " ")
    .toUpperCase();
};

const isRefundTransaction = (transaction: CreditStatementTransaction) => {
  const searchable = `${transaction.status ?? ""} ${transaction.type ?? ""} ${
    transaction.action ?? ""
  } ${transaction.reason ?? ""}`
    .toLowerCase()
    .trim();

  return searchable.includes("refund");
};

const isReceivedTransaction = (transaction: CreditStatementTransaction) => {
  const amount = getTransactionAmount(transaction);
  const direction = transaction.direction?.toLowerCase();
  const type = transaction.type?.toLowerCase();
  const action = transaction.action?.toLowerCase();

  return (
    direction === "credit" ||
    direction === "received" ||
    action === "add" ||
    action === "refund" ||
    type?.includes("received") ||
    type?.includes("credit") ||
    amount > 0
  );
};

const matchesTab = (
  transaction: CreditStatementTransaction,
  activeTab: StatementTab,
) => {
  if (activeTab === "ALL") return true;
  if (activeTab === "REFUNDS") return isRefundTransaction(transaction);
  if (activeTab === "RECEIVED") {
    return (
      isReceivedTransaction(transaction) && !isRefundTransaction(transaction)
    );
  }

  return !isReceivedTransaction(transaction) && !isRefundTransaction(transaction);
};

const getTransactionDescription = (transaction: CreditStatementTransaction) => {
  return (
    transaction.description ??
    transaction.note ??
    transaction.type ??
    transaction.reason ??
    transaction.creditType ??
    "Credit transaction"
  );
};

const getTransactionId = (
  transaction: CreditStatementTransaction,
  index: number,
) => {
  return transaction.transactionId ?? transaction.tx ?? transaction.id ?? `${index + 1}`;
};

const getTransactionDirectionLabel = (
  transaction: CreditStatementTransaction,
) => {
  return isReceivedTransaction(transaction) ? "Received" : "Payment";
};

const getSignedTransactionAmount = (
  transaction: CreditStatementTransaction,
) => {
  const amount = Math.abs(getTransactionAmount(transaction));
  return `${isReceivedTransaction(transaction) ? "+" : "-"}${amount.toFixed(2)}`;
};

const escapeCsvValue = (value: string | number) => {
  return `"${String(value).replaceAll('"', '""')}"`;
};

const escapeHtmlValue = (value: string | number) => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getExportFilename = (activeTab: StatementTab, extension: string) => {
  const date = new Date().toISOString().slice(0, 10);
  return `credit-statement-${activeTab.toLowerCase()}-${date}.${extension}`;
};

export default function CreditStatement() {
  const [activeTab, setActiveTab] = useState<StatementTab>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isError } = useGetCreditStatementQuery({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });
  const statementMeta = getStatementMeta(data);
  const transactions = getStatementRows(data).filter((transaction) =>
    matchesTab(transaction, activeTab),
  );
  const serverTotalItems =
    statementMeta?.totalItems ?? statementMeta?.total ?? statementMeta?.count;
  const totalItems = serverTotalItems ?? transactions.length;
  const totalPages =
    statementMeta?.totalPages ??
    Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const pageTransactions =
    serverTotalItems === undefined
      ? transactions.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE,
        )
      : transactions;
  const firstItemIndex =
    pageTransactions.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const lastItemIndex =
    pageTransactions.length > 0
      ? firstItemIndex + pageTransactions.length - 1
      : 0;

  const handleTabChange = (tab: StatementTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const handleCsvExport = () => {
    const headers = [
      "Timestamp",
      "Description",
      "Transaction ID",
      "Direction",
      "Status",
      "Settlement (CR)",
    ];
    const rows = transactions.map((transaction, index) => [
      getTransactionDate(transaction),
      getTransactionDescription(transaction),
      getTransactionId(transaction, index),
      getTransactionDirectionLabel(transaction),
      getTransactionStatus(transaction),
      getSignedTransactionAmount(transaction),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    downloadFile(
      csv,
      getExportFilename(activeTab, "csv"),
      "text/csv;charset=utf-8",
    );
  };

  const handlePdfExport = () => {
    const rows = transactions
      .map(
        (transaction, index) => `
          <tr>
            <td>${escapeHtmlValue(getTransactionDate(transaction))}</td>
            <td>
              <strong>${escapeHtmlValue(getTransactionDescription(transaction))}</strong>
              <div>${escapeHtmlValue(
                `${getTransactionDirectionLabel(transaction)} • ${getTransactionId(
                  transaction,
                  index,
                )}`,
              )}</div>
            </td>
            <td>${escapeHtmlValue(getTransactionStatus(transaction))}</td>
            <td class="amount">${escapeHtmlValue(getSignedTransactionAmount(transaction))}</td>
          </tr>
        `,
      )
      .join("");
    const printFrame = document.createElement("iframe");
    const statementHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Credit Statement</title>
          <style>
            body { font-family: Arial, sans-serif; color: #181d27; padding: 32px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            p { color: #535862; margin: 0 0 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; vertical-align: top; }
            th { color: #374151; background: #f9fafb; }
            .amount { text-align: right; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Credit Statement</h1>
          <p>${escapeHtmlValue(activeTab)} • ${escapeHtmlValue(
            new Date().toLocaleDateString("en-US"),
          )}</p>
          <table>
            <thead>
              <tr>
                <th>TIMESTAMP (UTC)</th>
                <th>CAPITAL ALLOCATION DETAILS</th>
                <th>LIFECYCLE STATUS</th>
                <th>SETTLEMENT (CR)</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4">No credit statement records found.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const frameDocument =
      printFrame.contentDocument ?? printFrame.contentWindow?.document;

    if (!frameDocument) {
      printFrame.remove();
      return;
    }

    frameDocument.open();
    frameDocument.write(statementHtml);
    frameDocument.close();

    window.setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      window.setTimeout(() => printFrame.remove(), 1000);
    }, 250);
  };

  return (
    <div className=" overflow-hidden max-w-[90vw] ">
      <div className="border-b border-purple-100 bg-white rounded-xl">
        <div className="px-6 py-5 ">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ListRestart />
              <span className="">Credit Statement</span>
            </h2>

            <div className="flex  max-w-[90vw] overflow-x-scroll gap-2 border  p-2 rounded-2xl md:rounded-full border-secondary bg-amber-600/20">
              {STATEMENT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-1.5 text-sm cursor-pointer font-medium rounded-full transition ${
                    tab === activeTab
                      ? "bg-secondary text-white"
                      : "text-secondary hover:bg-purple-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto ">
          <table className="w-full text-sm">
            <thead className=" border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">
                  TIMESTAMP (UTC)
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">
                  CAPITAL ALLOCATION DETAILS
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">
                  LIFECYCLE STATUS
                </th>
                <th className="px-6 py-4 text-right font-semibold text-gray-700">
                  SETTLEMENT (CR)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    Loading credit statement...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-red-600"
                  >
                    Failed to load credit statement.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && pageTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No credit statement records found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                pageTransactions.map((tx, i) => {
                  const amount = getTransactionAmount(tx);
                  const isReceived = isReceivedTransaction(tx);
                  const status = getTransactionStatus(tx);
                  const transactionId =
                    tx.transactionId ?? tx.tx ?? tx.id ?? "-";

                  return (
                    <tr
                      key={transactionId + i}
                      className="hover:bg-gray-50/70 transition"
                    >
                      <td className="px-6 py-4 text-gray-600">
                        {getTransactionDate(tx)}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <div className="">
                          {isReceived ? (
                            <div className="text-green-600 bg-green-600/20 p-2 rounded-full font-normal">
                              <ArrowUpRight />
                            </div>
                          ) : (
                            <div className="text-red-600 bg-red-500/20 p-2 rounded-full">
                              <ArrowDownRight />
                            </div>
                          )}
                        </div>
                        <div className=" gap-2">
                          <div className="font-medium text-gray-900">
                            {getTransactionDescription(tx)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {isReceived ? "Received" : "Payment"} •{" "}
                            {transactionId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            status === "FINALIZED" || status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : status === "CREDITED" || status === "RECEIVED"
                                ? "bg-blue-100 text-blue-800"
                                : status === "IN ESCROW"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        <span
                          className={
                            isReceived ? "text-green-600" : "text-red-600"
                          }
                        >
                          {isReceived ? "+" : ""}
                          {Math.abs(amount).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && !isError && totalItems > ITEMS_PER_PAGE && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <span>
            Showing {firstItemIndex}-{lastItemIndex} of {totalItems}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCsvExport}
            disabled={isLoading || isError || transactions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition"
          >
            <Download size={16} />
            CSV Export
          </button>
          <Button
            onClick={handlePdfExport}
            disabled={isLoading || isError || transactions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary text-white rounded-lg font-medium transition"
          >
            <FileDown size={16} />
            Statement PDF
          </Button>
        </div>
      </div>
      <p className="max-w-3xl text-xs lowercase md:uppercase md:text-md text-center mx-auto text-[#A4A7AE]">
        CAPITAL SETTLEMENTS AND ESCROW DEPLOYMENTS ARE GOVERNED BY BACKLYST.
        INSTITUTIONAL FULFILLMENT PROTOCOLS AND AUTOMATED FINANCIAL GOVERNANCE
        POLICIES.
      </p>
    </div>
  );
}
