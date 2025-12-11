// utils/toastUtils.js

import { toast } from "react-hot-toast";
import { FiCheckCircle, FiXCircle, FiInfo } from "react-icons/fi";
import { createElement } from "react";

const toastIcons = {
  success: createElement(FiCheckCircle, { className: "text-green-500 text-lg mr-2" }),
  error: createElement(FiXCircle, { className: "text-red-500 text-lg mr-2" }),
  info: createElement(FiInfo, { className: "text-blue-500 text-lg mr-2" }),
};

export const showToast = (message, type = "info") => {
  toast.custom((t) =>
    createElement(
      "div",
      {
        className: `max-w-md w-full bg-white shadow-lg rounded-lg px-5 py-3 flex items-center justify-between border-l-4 transition-transform duration-300
        ${type === "success" ? "border-green-500" : ""}
        ${type === "error" ? "border-red-500" : ""}
        ${type === "info" ? "border-blue-500" : ""}`,
      },
      createElement(
        "div",
        { className: "flex items-center gap-2" },
        toastIcons[type] || toastIcons.info,
        createElement(
          "span",
          { className: "text-sm font-medium text-gray-800" },
          message
        )
      ),
      // createElement(
      //   "button",
      //   {
      //     className:
      //       "ml-4 text-gray-400 hover:text-gray-700 text-lg font-bold focus:outline-none",
      //     onClick: () => toast.dismiss(t.id),
      //   },
      //   "×"
      // )
    ), { duration: 3000 }
  );
};
