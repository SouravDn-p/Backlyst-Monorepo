"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { LegalDocumentType } from "@/types/settings/legalDocsTypes";
import { useAcceptLegalDocMutation, useGetMyLegalDocsQuery } from "@/redux/features/api/settings/legalDocs/legalDocsApi";


const documentTypeMap: Record<string, LegalDocumentType> = {
  "TERMS AND CONDITIONS": "TERMS_AND_CONDITIONS",
  "PRIVACY POLICY": "PRIVACY_POLICY",
  "COOKIE POLICY": "COOKIE_POLICY",
  "DATA PROCESSING AGREEMENT":
    "DATA_PROCESSING_AGREEMENT",
};

export default function LegalAndConsent() {
  const { data, isLoading, refetch } =
    useGetMyLegalDocsQuery();

  const [acceptLegalDoc, { isLoading: isAccepting }] =
    useAcceptLegalDocMutation();

  const [selectedDoc, setSelectedDoc] =
    useState<any>(null);

  const openModal = (doc: any) => {
    setSelectedDoc(doc);
  };

  const closeModal = () => {
    setSelectedDoc(null);
  };

  const handleAccept = async () => {
    if (!selectedDoc) return;

    try {
      const type =
        documentTypeMap[selectedDoc.document.title];

      await acceptLegalDoc(type).unwrap();

      toast.success(
        "Document accepted successfully"
      );

      await refetch();
      closeModal();
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          "Failed to accept document"
      );
    }
  };

  const legalDocs = data?.data ?? [];

  return (
    <>
      <div className="p-8 bg-white rounded-2xl overflow-hidden">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Legal & Consent
          </h2>

          <p className="mt-1.5 text-sm text-gray-600">
            Legal agreements and policy
            acknowledgements.
          </p>
        </div>

        <div className="py-4 space-y-10">
          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 pl-8 text-sm font-semibold text-gray-700">
                    Document Name
                  </th>

                  <th className="p-4 text-sm font-semibold text-gray-700">
                    Version
                  </th>

                  <th className="p-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="p-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : legalDocs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-gray-500"
                    >
                      No legal documents found.
                    </td>
                  </tr>
                ) : (
                  legalDocs.map((doc) => (
                    <tr
                      key={doc.document.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-5 pl-8 font-medium text-gray-700">
                        {doc.document.title}
                      </td>

                      <td className="py-5 text-gray-600">
                        {doc.latestVersion.version}
                      </td>

                      <td className="py-5">
                        {doc.isAccepted ? (
                          <span className="inline-flex px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                            Accepted
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-5">
                        <button
                          onClick={() =>
                            openModal(doc)
                          }
                          className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="p-4 rounded-2xl flex items-start gap-3 text-sm bg-indigo">
            <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />

            <p className="text-indigo-600">
              You will be required to re-accept
              updated policies whenever a new
              version is released.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedDoc.document.title}
              </h3>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-sm text-gray-500">
                    Document Name
                  </p>
                  <p className="font-medium text-gray-900">
                    {selectedDoc.document.title}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Version
                  </p>
                  <p className="font-medium text-gray-900">
                    {
                      selectedDoc.latestVersion
                        .version
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Created At
                  </p>
                  <p className="font-medium text-gray-900">
                    {new Date(
                      selectedDoc.latestVersion.createdAt
                    ).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Status
                  </p>

                  {selectedDoc.isAccepted ? (
                    <span className="inline-flex px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                      Accepted
                    </span>
                  ) : (
                    <span className="inline-flex px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Additional Information
                </h4>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    Latest Version:{" "}
                    {
                      selectedDoc.latestVersion
                        .version
                    }
                  </p>

                  <p>
                    Is Latest Version:{" "}
                    {selectedDoc.isLatest
                      ? "Yes"
                      : "No"}
                  </p>

                  <p>
                    Previously Accepted Any
                    Version:{" "}
                    {selectedDoc.hasAcceptedAnyVersion
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t p-6">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium"
              >
                Close
              </button>

              {!selectedDoc.isAccepted && (
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAccepting
                    ? "Accepting..."
                    : "Accept Document"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}