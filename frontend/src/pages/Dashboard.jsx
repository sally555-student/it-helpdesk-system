
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import html2canvas from "html2canvas";

import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import * as ticketService from "../services/ticketService";



/* =========================================================
   HELPERS
========================================================= */

const statusKey = (value = "") =>
  String(value)
    .replace(/\s+/g, "")
    .toLowerCase();

const priorityKey = (value = "") =>
  String(value).toLowerCase();

const getCreatedDate = (ticket) =>
  ticket.createdDate ||
  ticket.createdAt ||
  null;

const getResolvedDate = (ticket) =>
  ticket.resolvedDate ||
  ticket.resolvedAt ||
  ticket.closedDate ||
  ticket.closedAt ||
  ticket.completedAt ||
  null;

const getCategoryName = (ticket) =>
  ticket.categoryName ||
  ticket.category?.categoryName ||
  ticket.category?.name ||
  "Uncategorized";

const getAgentName = (ticket) =>
  ticket.assignedToName ||
  ticket.assignedToFullName ||
  ticket.assignedToUserName ||
  ticket.assignedTo?.fullName ||
  ticket.assignedTo?.name ||
  "Unassigned";

function formatDuration(minutes) {
  if (
    minutes === null ||
    minutes === undefined ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return "—";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours < 24) {
    return mins > 0
      ? `${hours}h ${mins}m`
      : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${days}d ${remainingHours}h`
    : `${days}d`;
}

function formatDateTime(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function getResolutionMinutes(ticket) {
  const status = statusKey(ticket.statusName);

  const isResolved = ["resolved", "closed"].includes(status);

  if (!isResolved) {
    return null;
  }

  const seconds = Number(ticket.totalWorkingSeconds);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return seconds / 60;
}

/* =========================================================
   STAT ICON
========================================================= */

function StatIcon({ type }) {
  const paths = {
    total: (
      <>
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
        />
        <path d="M8 9h8M8 13h5" />
      </>
    ),

    open: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path d="M12 8v4l3 2" />
      </>
    ),

    progress: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    resolved: (
      <>
        <path d="m5 12 4 4L19 6" />
        <circle
          cx="12"
          cy="12"
          r="9"
        />
      </>
    ),

    clock: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path d="M12 8v4l3 2" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type]}
    </svg>
  );
}

/* =========================================================
   TOOLTIP
========================================================= */

function TicketTrendTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload ||
    !payload.length
  ) {
    return null;
  }

  return (
    <div className="ticket-trend-tooltip">
      <div className="ticket-trend-tooltip-date">
        {label}
      </div>

      {payload.map((item) => (
        <div
          className="ticket-trend-tooltip-row"
          key={item.dataKey}
        >
          <span>
            {item.dataKey === "created"
              ? "Created"
              : "Resolved"}
          </span>

          <strong>
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* =======================================================
     CHART REFERENCES
  ======================================================= */

  const ticketTrendRef = useRef(null);
  const categoryChartRef = useRef(null);
  const exportRef = useRef(null);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const data =
          await ticketService.getTickets();

        if (mounted) {
          setTickets(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        if (mounted) {
          setError(
            "Couldn't load dashboard data. Try refreshing the page."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     CLOSE EXPORT MENU
  ======================================================= */

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        exportRef.current &&
        !exportRef.current.contains(
          event.target
        )
      ) {
        setExportOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const open = tickets.filter(
      (ticket) =>
        statusKey(
          ticket.statusName
        ) === "open"
    ).length;

    const inProgress =
      tickets.filter(
        (ticket) =>
          statusKey(
            ticket.statusName
          ) === "inprogress"
      ).length;

    const resolved =
      tickets.filter((ticket) =>
        [
          "resolved",
          "closed",
        ].includes(
          statusKey(
            ticket.statusName
          )
        )
      ).length;

    return {
      total: tickets.length,
      open,
      inProgress,
      resolved,
    };
  }, [tickets]);

  /* =======================================================
     AVERAGE RESOLUTION
  ======================================================= */

  const avgResolutionMinutes =
    useMemo(() => {
      const times = tickets
        .map(getResolutionMinutes)
        .filter(
          (value) =>
            value !== null &&
            Number.isFinite(value)
        );

      if (!times.length) {
        return null;
      }

      return (
        times.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / times.length
      );
    }, [tickets]);

  /* =======================================================
     TICKET TRENDS
  ======================================================= */

  const ticketTrends = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setHours(
        0,
        0,
        0,
        0
      );

      date.setDate(
        date.getDate() - i
      );

      days.push({
        date,
        created: 0,
        resolved: 0,
      });
    }

    tickets.forEach((ticket) => {
      const createdValue =
        getCreatedDate(ticket);

      if (createdValue) {
        const created =
          new Date(createdValue);

        if (
          !Number.isNaN(
            created.getTime()
          )
        ) {
          const day =
            days.find(
              (item) =>
                item.date.getFullYear() ===
                  created.getFullYear() &&
                item.date.getMonth() ===
                  created.getMonth() &&
                item.date.getDate() ===
                  created.getDate()
            );

          if (day) {
            day.created++;
          }
        }
      }

      const resolvedValue =
        getResolvedDate(ticket);

      if (resolvedValue) {
        const resolved =
          new Date(resolvedValue);

        if (
          !Number.isNaN(
            resolved.getTime()
          )
        ) {
          const day =
            days.find(
              (item) =>
                item.date.getFullYear() ===
                  resolved.getFullYear() &&
                item.date.getMonth() ===
                  resolved.getMonth() &&
                item.date.getDate() ===
                  resolved.getDate()
            );

          if (day) {
            day.resolved++;
          }
        }
      }
    });

    return days.map((day) => ({
      label:
        day.date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),

      created: day.created,
      resolved: day.resolved,
    }));
  }, [tickets]);

  /* =======================================================
     CATEGORY DATA
  ======================================================= */

  const categoryData = useMemo(() => {
    const categories = {};

    tickets.forEach((ticket) => {
      const category =
        getCategoryName(ticket);

      categories[category] =
        (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value,
        percentage: tickets.length
          ? Math.round(
              (value /
                tickets.length) *
                100
            )
          : 0,
      }))
      .sort(
        (a, b) =>
          b.value - a.value
      );
  }, [tickets]);

  const categoryColors = [
    "#2563eb",
    "#7c3aed",
    "#0891b2",
    "#059669",
    "#d97706",
    "#dc2626",
    "#db2777",
    "#4f46e5",
  ];

  const categoryGradient =
    useMemo(() => {
      if (
        !categoryData.length ||
        !tickets.length
      ) {
        return "conic-gradient(#e5e7eb 0deg 360deg)";
      }

      const degreesPerTicket =
        360 / tickets.length;

      let currentDegree = 0;

      const parts =
        categoryData.map(
          (category, index) => {
            const start =
              currentDegree;

            const end =
              currentDegree +
              category.value *
                degreesPerTicket;

            currentDegree = end;

            return `${
              categoryColors[
                index %
                  categoryColors.length
              ]
            } ${start}deg ${end}deg`;
          }
        );

      return `conic-gradient(${parts.join(
        ", "
      )})`;
    }, [
      categoryData,
      tickets.length,
    ]);

  /* =======================================================
     PRIORITY
  ======================================================= */

  const priorityCounts = useMemo(() => {
    const count = (priority) =>
      tickets.filter(
        (ticket) =>
          priorityKey(
            ticket.priorityName
          ) === priority
      ).length;

    return [
      {
        name: "Critical",
        value: count("critical"),
        className: "critical",
      },

      {
        name: "High",
        value: count("high"),
        className: "high",
      },

      {
        name: "Medium",
        value: count("medium"),
        className: "medium",
      },

      {
        name: "Low",
        value: count("low"),
        className: "low",
      },
    ];
  }, [tickets]);

  /* =======================================================
     AGENT PERFORMANCE
  ======================================================= */

  const agentPerformance =
    useMemo(() => {
      const agents = {};

      tickets.forEach((ticket) => {
        const agent =
          getAgentName(ticket);

        if (
          !agent ||
          agent === "Unassigned"
        ) {
          return;
        }

        if (!agents[agent]) {
          agents[agent] = {
            name: agent,
            resolved: 0,
            resolutionTimes: [],
          };
        }

        const isResolved =
          [
            "resolved",
            "closed",
          ].includes(
            statusKey(
              ticket.statusName
            )
          );

        if (!isResolved) {
          return;
        }

        agents[agent].resolved++;

        const resolutionMinutes =
          getResolutionMinutes(
            ticket
          );

        if (
          resolutionMinutes !==
            null &&
          Number.isFinite(
            resolutionMinutes
          )
        ) {
          agents[
            agent
          ].resolutionTimes.push(
            resolutionMinutes
          );
        }
      });

      return Object.values(agents)
        .map((agent) => {
          const avgTime =
            agent.resolutionTimes
              .length
              ? agent.resolutionTimes.reduce(
                  (sum, value) =>
                    sum + value,
                  0
                ) /
                agent
                  .resolutionTimes
                  .length
              : null;

          return {
            name: agent.name,
            resolved:
              agent.resolved,
            avgTime,
          };
        })
        .sort(
          (a, b) =>
            b.resolved -
            a.resolved
        );
    }, [tickets]);

  /* =======================================================
     CAPTURE CHART
  ======================================================= */

  async function captureChart(element) {
    if (!element) {
      return null;
    }

    try {
      const canvas =
        await html2canvas(
          element,
          {
            backgroundColor:
              "#ffffff",

            scale: 2,

            useCORS: true,

            logging: false,

            windowWidth:
              element.scrollWidth,

            windowHeight:
              element.scrollHeight,
          }
        );

      return canvas.toDataURL(
        "image/png",
        1.0
      );
    } catch (err) {
      console.error(
        "Chart capture failed:",
        err
      );

      return null;
    }
  }

  /* =======================================================
     PDF EXPORT
     ACTUAL VISUAL CHARTS
  ======================================================= */

  async function exportPDF() {
    if (exporting) return;

    setExporting(true);
    setExportOpen(false);

    try {
      await new Promise(
        (resolve) =>
          setTimeout(resolve, 500)
      );

      const trendImage =
        await captureChart(
          ticketTrendRef.current
        );

      const categoryImage =
        await captureChart(
          categoryChartRef.current
        );

      const doc =
        new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      const margin = 14;

      /* ===================================================
         PAGE 1
      =================================================== */

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(22);

      doc.setTextColor(
        16,
        24,
        40
      );

      doc.text(
        "HelpDesk Dashboard",
        margin,
        17
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        102,
        112,
        133
      );

      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        margin,
        24
      );

      /* SUMMARY */

      const summary = [
        [
          "Total Tickets",
          stats.total,
        ],

        [
          "Open Tickets",
          stats.open,
        ],

        [
          "In Progress",
          stats.inProgress,
        ],

        [
          "Resolved Tickets",
          stats.resolved,
        ],

        [
          "Avg Resolution",
          formatDuration(
            avgResolutionMinutes
          ),
        ],
      ];

      const cardGap = 4;

      const cardWidth =
        (pageWidth -
          margin * 2 -
          cardGap * 4) /
        5;

      const cardY = 32;

      summary.forEach(
        ([label, value], index) => {
          const x =
            margin +
            index *
              (cardWidth + cardGap);

          doc.setDrawColor(
            225,
            229,
            235
          );

          doc.setFillColor(
            255,
            255,
            255
          );

          doc.roundedRect(
            x,
            cardY,
            cardWidth,
            22,
            2,
            2,
            "FD"
          );

          doc.setFontSize(9);

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.setTextColor(
            102,
            112,
            133
          );

          doc.text(
            String(label),
            x + 5,
            cardY + 8
          );

          doc.setFontSize(15);

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setTextColor(
            16,
            24,
            40
          );

          doc.text(
            String(value),
            x + 5,
            cardY + 17
          );
        }
      );

      /* TREND TITLE */

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(16);

      doc.setTextColor(
        16,
        24,
        40
      );

      doc.text(
        "Ticket Trends",
        margin,
        67
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        102,
        112,
        133
      );

      doc.text(
        "Tickets created and resolved over the last 7 days",
        margin,
        73
      );

      /* ACTUAL CHART */

      if (trendImage) {
        doc.addImage(
          trendImage,
          "PNG",
          margin,
          78,
          pageWidth -
            margin * 2,
          78
        );
      }

      /* ===================================================
         PAGE 2
      =================================================== */

      doc.addPage();

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(20);

      doc.setTextColor(
        16,
        24,
        40
      );

      doc.text(
        "Ticket Distribution",
        margin,
        18
      );

      doc.setFontSize(15);

      doc.text(
        "Tickets by Category",
        margin,
        30
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(9);

      doc.setTextColor(
        102,
        112,
        133
      );

      doc.text(
        "Distribution of support requests by category",
        margin,
        36
      );

      /* ACTUAL DONUT */

      if (categoryImage) {
        doc.addImage(
          categoryImage,
          "PNG",
          margin,
          42,
          95,
          95
        );
      }

      /* CATEGORY TABLE */

      autoTable(doc, {
        startY: 48,

        margin: {
          left: 125,
          right: margin,
        },

        head: [
          [
            "Category",
            "Tickets",
            "Percentage",
          ],
        ],

        body:
          categoryData.length
            ? categoryData.map(
                (category) => [
                  category.name,
                  category.value,
                  `${category.percentage}%`,
                ]
              )
            : [
                [
                  "No data",
                  0,
                  "0%",
                ],
              ],

        theme: "grid",

        styles: {
          fontSize: 9,
          cellPadding: 3,
        },

        headStyles: {
          fontStyle: "bold",
        },
      });

      /* PRIORITY */

      const priorityY =
        Math.max(
          145,
          doc.lastAutoTable.finalY +
            12
        );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(15);

      doc.setTextColor(
        16,
        24,
        40
      );

      doc.text(
        "Priority Overview",
        margin,
        priorityY
      );

      autoTable(doc, {
        startY:
          priorityY + 5,

        head: [
          [
            "Priority",
            "Tickets",
            "Percentage",
          ],
        ],

        body:
          priorityCounts.map(
            (item) => [
              item.name,
              item.value,
              tickets.length
                ? `${Math.round(
                    (item.value /
                      tickets.length) *
                      100
                  )}%`
                : "0%",
            ]
          ),

        theme: "grid",

        styles: {
          fontSize: 9,
          cellPadding: 3,
        },

        headStyles: {
          fontStyle: "bold",
        },
      });

      /* ===================================================
         PAGE 3
      =================================================== */

      doc.addPage();

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(20);

      doc.setTextColor(
        16,
        24,
        40
      );

      doc.text(
        "Agent Performance",
        margin,
        18
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      doc.setTextColor(
        102,
        112,
        133
      );

      doc.text(
        "Resolution performance by support agent",
        margin,
        25
      );

      autoTable(doc, {
        startY: 32,

        head: [
          [
            "Agent Name",
            "Resolved",
            "Average Resolution Time",
          ],
        ],

        body:
          agentPerformance.length
            ? agentPerformance.map(
                (agent) => [
                  agent.name,
                  agent.resolved,
                  formatDuration(
                    agent.avgTime
                  ),
                ]
              )
            : [
                [
                  "No agent data",
                  0,
                  "—",
                ],
              ],

        theme: "grid",

        styles: {
          fontSize: 10,
          cellPadding: 4,
        },

        headStyles: {
          fontStyle: "bold",
        },
      });

      /* FOOTERS */

      const totalPages =
        doc.internal.getNumberOfPages();

      for (
        let page = 1;
        page <= totalPages;
        page++
      ) {
        doc.setPage(page);

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          152,
          162,
          179
        );

        doc.text(
          `HelpDesk Dashboard • Page ${page} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 8,
          {
            align: "right",
          }
        );
      }

      doc.save(
        `HelpDesk-Dashboard-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );

    } catch (err) {
      console.error(
        "PDF export failed:",
        err
      );

      alert(
        "Unable to export PDF. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }

  /* =======================================================
     EXCEL EXPORT
     WITH ACTUAL VISUAL CHART IMAGES
  ======================================================= */

  async function exportExcel() {
    if (exporting) return;

    setExporting(true);
    setExportOpen(false);

    try {
      await new Promise(
        (resolve) =>
          setTimeout(resolve, 500)
      );

      /* Capture actual dashboard charts */

      const trendImage =
        await captureChart(
          ticketTrendRef.current
        );

      const categoryImage =
        await captureChart(
          categoryChartRef.current
        );

      /* Create workbook */

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator =
        "HelpDesk";

      workbook.lastModifiedBy =
        "HelpDesk";

      workbook.created =
        new Date();

      workbook.modified =
        new Date();

      /* ===================================================
         DASHBOARD SHEET
      =================================================== */

      const dashboard =
        workbook.addWorksheet(
          "Dashboard"
        );

      dashboard.views = [
        {
          showGridLines: false,
        },
      ];

      dashboard.columns = [
        {
          width: 24,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
        {
          width: 18,
        },
      ];

      /* TITLE */

      dashboard.mergeCells(
        "A1:J1"
      );

      const title =
        dashboard.getCell(
          "A1"
        );

      title.value =
        "HelpDesk Dashboard";

      title.font = {
        bold: true,
        size: 22,
      };

      title.alignment = {
        horizontal:
          "left",
        vertical:
          "middle",
      };

      dashboard.getRow(
        1
      ).height = 32;

      dashboard.mergeCells(
        "A2:J2"
      );

      dashboard.getCell(
        "A2"
      ).value =
        `Generated: ${new Date().toLocaleString()}`;

      dashboard.getCell(
        "A2"
      ).font = {
        size: 10,
        italic: true,
      };

      /* ===================================================
         SUMMARY
      =================================================== */

      const summaryItems = [
        [
          "A4",
          "Total Tickets",
          stats.total,
        ],

        [
          "C4",
          "Open Tickets",
          stats.open,
        ],

        [
          "E4",
          "In Progress",
          stats.inProgress,
        ],

        [
          "G4",
          "Resolved Tickets",
          stats.resolved,
        ],

        [
          "I4",
          "Avg Resolution",
          formatDuration(
            avgResolutionMinutes
          ),
        ],
      ];

      summaryItems.forEach(
        ([cell, label, value]) => {
          const labelCell =
            dashboard.getCell(
              cell
            );

          labelCell.value =
            label;

          labelCell.font = {
            bold: true,
            size: 10,
          };

          const row =
            labelCell.row;

          const col =
            labelCell.col;

          const valueCell =
            dashboard.getCell(
              row + 1,
              col
            );

          valueCell.value =
            value;

          valueCell.font = {
            bold: true,
            size: 16,
          };
        }
      );

      /* ===================================================
         TICKET TRENDS
      =================================================== */

      dashboard.mergeCells(
        "A8:J8"
      );

      dashboard.getCell(
        "A8"
      ).value =
        "Ticket Trends";

      dashboard.getCell(
        "A8"
      ).font = {
        bold: true,
        size: 17,
      };

      dashboard.mergeCells(
        "A9:J9"
      );

      dashboard.getCell(
        "A9"
      ).value =
        "Tickets created and resolved over the last 7 days";

      dashboard.getCell(
        "A9"
      ).font = {
        size: 10,
        italic: true,
      };

      if (trendImage) {
        const imageId =
          workbook.addImage({
            base64: trendImage,
            extension: "png",
          });

        dashboard.addImage(
          imageId,
          {
            tl: {
              col: 0,
              row: 10,
            },

            ext: {
              width: 900,
              height: 360,
            },
          }
        );
      }

      /* ===================================================
         CATEGORY
      =================================================== */

      dashboard.mergeCells(
        "A31:E31"
      );

      dashboard.getCell(
        "A31"
      ).value =
        "Tickets by Category";

      dashboard.getCell(
        "A31"
      ).font = {
        bold: true,
        size: 17,
      };

      dashboard.mergeCells(
        "A32:E32"
      );

      dashboard.getCell(
        "A32"
      ).value =
        "Distribution of support requests by category";

      dashboard.getCell(
        "A32"
      ).font = {
        size: 10,
        italic: true,
      };

      if (categoryImage) {
        const imageId =
          workbook.addImage({
            base64:
              categoryImage,
            extension: "png",
          });

        dashboard.addImage(
          imageId,
          {
            tl: {
              col: 0,
              row: 33,
            },

            ext: {
              width: 430,
              height: 430,
            },
          }
        );
      }

      /* ===================================================
         CATEGORY DATA NEXT TO CHART
      =================================================== */

      dashboard.getCell(
        "F33"
      ).value =
        "Category";

      dashboard.getCell(
        "G33"
      ).value =
        "Tickets";

      dashboard.getCell(
        "H33"
      ).value =
        "Percentage";

      [
        "F33",
        "G33",
        "H33",
      ].forEach((cell) => {
        dashboard.getCell(
          cell
        ).font = {
          bold: true,
        };
      });

      categoryData.forEach(
        (category, index) => {
          const row =
            34 + index;

          dashboard.getCell(
            `F${row}`
          ).value =
            category.name;

          dashboard.getCell(
            `G${row}`
          ).value =
            category.value;

          dashboard.getCell(
            `H${row}`
          ).value =
            `${category.percentage}%`;
        }
      );

      /* ===================================================
         PRIORITY
      =================================================== */

      dashboard.mergeCells(
        "F45:J45"
      );

      dashboard.getCell(
        "F45"
      ).value =
        "Priority Overview";

      dashboard.getCell(
        "F45"
      ).font = {
        bold: true,
        size: 17,
      };

      dashboard.getCell(
        "F46"
      ).value =
        "Priority";

      dashboard.getCell(
        "G46"
      ).value =
        "Tickets";

      dashboard.getCell(
        "H46"
      ).value =
        "Percentage";

      [
        "F46",
        "G46",
        "H46",
      ].forEach((cell) => {
        dashboard.getCell(
          cell
        ).font = {
          bold: true,
        };
      });

      priorityCounts.forEach(
        (item, index) => {
          const row =
            47 + index;

          dashboard.getCell(
            `F${row}`
          ).value =
            item.name;

          dashboard.getCell(
            `G${row}`
          ).value =
            item.value;

          dashboard.getCell(
            `H${row}`
          ).value =
            tickets.length
              ? `${Math.round(
                  (item.value /
                    tickets.length) *
                    100
                )}%`
              : "0%";
        }
      );

      /* ===================================================
         AGENT PERFORMANCE
      =================================================== */

      dashboard.mergeCells(
        "A56:J56"
      );

      dashboard.getCell(
        "A56"
      ).value =
        "Agent Performance";

      dashboard.getCell(
        "A56"
      ).font = {
        bold: true,
        size: 17,
      };

      const agentHeaders = [
        "Agent Name",
        "Resolved",
        "Average Resolution Time",
      ];

      agentHeaders.forEach(
        (header, index) => {
          const cell =
            dashboard.getCell(
              57,
              index + 1
            );

          cell.value =
            header;

          cell.font = {
            bold: true,
          };
        }
      );

      agentPerformance.forEach(
        (agent, index) => {
          const row =
            58 + index;

          dashboard.getCell(
            row,
            1
          ).value =
            agent.name;

          dashboard.getCell(
            row,
            2
          ).value =
            agent.resolved;

          dashboard.getCell(
            row,
            3
          ).value =
            formatDuration(
              agent.avgTime
            );
        }
      );

      /* ===================================================
         TICKET DATA SHEET
      =================================================== */

      const ticketSheet =
        workbook.addWorksheet(
          "Tickets"
        );

      const ticketHeaders = [
        "Ticket Reference",
        "Title",
        "Category",
        "Priority",
        "Status",
        "Created By",
        "Assigned To",
        "Created Date",
        "Resolved Date",
        "Resolution Time",
      ];

      ticketSheet.addRow(
        ticketHeaders
      );

      ticketSheet
        .getRow(1)
        .font = {
          bold: true,
        };

      tickets.forEach(
        (ticket) => {
          ticketSheet.addRow([
            ticket.ticketReference ||
              `#${ticket.ticketId}`,

            ticket.title || "",

            getCategoryName(
              ticket
            ),

            ticket.priorityName ||
              "",

            ticket.statusName ||
              "",

            ticket.createdByName ||
              ticket.createdByFullName ||
              ticket.createdBy?.fullName ||
              "",

            getAgentName(
              ticket
            ),

            formatDateTime(
              getCreatedDate(
                ticket
              )
            ),

            formatDateTime(
              getResolvedDate(
                ticket
              )
            ),

            formatDuration(
              getResolutionMinutes(
                ticket
              )
            ),
          ]);
        }
      );

      ticketSheet.columns.forEach(
        (column) => {
          column.width = 22;
        }
      );

      /* ===================================================
         CATEGORY SHEET
      =================================================== */

      const categorySheet =
        workbook.addWorksheet(
          "Categories"
        );

      categorySheet.addRow([
        "Category",
        "Tickets",
        "Percentage",
      ]);

      categorySheet
        .getRow(1)
        .font = {
          bold: true,
        };

      categoryData.forEach(
        (category) => {
          categorySheet.addRow([
            category.name,
            category.value,
            `${category.percentage}%`,
          ]);
        }
      );

      categorySheet.columns = [
        {
          width: 30,
        },
        {
          width: 15,
        },
        {
          width: 15,
        },
      ];

      /* ===================================================
         PRIORITY SHEET
      =================================================== */

      const prioritySheet =
        workbook.addWorksheet(
          "Priorities"
        );

      prioritySheet.addRow([
        "Priority",
        "Tickets",
        "Percentage",
      ]);

      prioritySheet
        .getRow(1)
        .font = {
          bold: true,
        };

      priorityCounts.forEach(
        (item) => {
          prioritySheet.addRow([
            item.name,
            item.value,
            tickets.length
              ? `${Math.round(
                  (item.value /
                    tickets.length) *
                    100
                )}%`
              : "0%",
          ]);
        }
      );

      prioritySheet.columns = [
        {
          width: 20,
        },
        {
          width: 15,
        },
        {
          width: 15,
        },
      ];

      /* ===================================================
         AGENT SHEET
      =================================================== */

      const agentSheet =
        workbook.addWorksheet(
          "Agent Performance"
        );

      agentSheet.addRow([
        "Agent Name",
        "Resolved",
        "Average Resolution Time",
      ]);

      agentSheet
        .getRow(1)
        .font = {
          bold: true,
        };

      agentPerformance.forEach(
        (agent) => {
          agentSheet.addRow([
            agent.name,
            agent.resolved,
            formatDuration(
              agent.avgTime
            ),
          ]);
        }
      );

      agentSheet.columns = [
        {
          width: 30,
        },
        {
          width: 15,
        },
        {
          width: 28,
        },
      ];

      /* ===================================================
         TRENDS SHEET
      =================================================== */

      const trendSheet =
        workbook.addWorksheet(
          "Ticket Trends"
        );

      trendSheet.addRow([
        "Day",
        "Created",
        "Resolved",
      ]);

      trendSheet
        .getRow(1)
        .font = {
          bold: true,
        };

      ticketTrends.forEach(
        (day) => {
          trendSheet.addRow([
            day.label,
            day.created,
            day.resolved,
          ]);
        }
      );

      trendSheet.columns = [
        {
          width: 15,
        },
        {
          width: 15,
        },
        {
          width: 15,
        },
      ];

      /* ===================================================
         FREEZE HEADERS
      =================================================== */

      ticketSheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      categorySheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      prioritySheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      agentSheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      trendSheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      /* ===================================================
         DOWNLOAD
      =================================================== */

      const buffer =
        await workbook.xlsx.writeBuffer();

      const blob =
        new Blob(
          [buffer],
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `HelpDesk-Dashboard-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      window.URL.revokeObjectURL(
        url
      );

    } catch (err) {
      console.error(
        "Excel export failed:",
        err
      );

      alert(
        "Unable to export Excel. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppLayout>

      <div className="dashboard-page">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dashboard-header">

          <div className="dashboard-header-content">

            <p className="dashboard-eyebrow">
              SUPPORT OVERVIEW
            </p>

            <h1>
              Welcome back,{" "}
              {user?.fullName ||
                "User"}
              !
            </h1>

            <p className="dashboard-header-description">
              Monitor ticket activity,
              resolution performance
              and support team
              efficiency.
            </p>

          </div>

          <div className="dashboard-header-actions">

            {/* EXPORT */}

            <div
              className="dashboard-export-wrapper"
              ref={exportRef}
            >

              <button
                type="button"
                className="dashboard-export-button"
                onClick={() =>
                  setExportOpen(
                    (value) =>
                      !value
                  )
                }
                disabled={
                  exporting
                }
              >

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>

                {exporting
                  ? "Exporting..."
                  : "Export"}

                <svg
                  className={`export-chevron ${
                    exportOpen
                      ? "open"
                      : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>

              </button>

              {exportOpen &&
                !exporting && (
                  <div className="dashboard-export-menu">

                    <button
                      type="button"
                      onClick={
                        exportPDF
                      }
                    >

                      <span className="export-menu-icon pdf">

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                          <path d="M8 13h8M8 17h5" />
                        </svg>

                      </span>

                      <span>

                        <strong>
                          Export as PDF
                        </strong>

                        <small>
                          Charts + report
                        </small>

                      </span>

                    </button>

                    <button
                      type="button"
                      onClick={
                        exportExcel
                      }
                    >

                      <span className="export-menu-icon excel">

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                          />

                          <path d="M8 8l8 8M16 8l-8 8" />
                        </svg>

                      </span>

                      <span>

                        <strong>
                          Export as Excel
                        </strong>

                        <small>
                          Charts + data
                        </small>

                      </span>

                    </button>

                  </div>
                )}

            </div>

            {/* NEW TICKET */}

            {/* NEW TICKET — EMPLOYEE / ADMIN ONLY */}

{["Employee", "Admin"].includes(user?.role) && (
  <Link
    className="dashboard-new-ticket"
    to="/tickets/new"
  >
    <span>+</span>
    New Ticket
  </Link>
)}

          </div>

        </header>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="dashboard-loading">

            <div className="dashboard-loading-spinner" />

            <span>
              Loading dashboard...
            </span>

          </div>

        ) : (

          <>

            {/* =================================================
                STATS
            ================================================= */}

            <section className="dashboard-stat-grid">

              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon total">
                  <StatIcon type="total" />
                </div>

                <div className="dashboard-stat-content">

                  <span className="dashboard-stat-label">
                    Total Tickets
                  </span>

                  <strong className="dashboard-stat-value">
                    {stats.total}
                  </strong>

                </div>

              </div>


              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon open">
                  <StatIcon type="open" />
                </div>

                <div className="dashboard-stat-content">

                  <span className="dashboard-stat-label">
                    Open Tickets
                  </span>

                  <strong className="dashboard-stat-value">
                    {stats.open}
                  </strong>

                </div>

              </div>


              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon progress">
                  <StatIcon type="progress" />
                </div>

                <div className="dashboard-stat-content">

                  <span className="dashboard-stat-label">
                    In Progress
                  </span>

                  <strong className="dashboard-stat-value">
                    {stats.inProgress}
                  </strong>

                </div>

              </div>


              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon resolved">
                  <StatIcon type="resolved" />
                </div>

                <div className="dashboard-stat-content">

                  <span className="dashboard-stat-label">
                    Resolved Tickets
                  </span>

                  <strong className="dashboard-stat-value">
                    {stats.resolved}
                  </strong>

                </div>

              </div>

            </section>

            {/* =================================================
                AVG RESOLUTION
            ================================================= */}

            <section className="dashboard-metric-row">

              <div className="dashboard-metric-card">

                <div className="metric-card-header">

                  <div>

                    <span className="metric-card-title">
                      Avg Resolution Time
                    </span>

                    <span className="metric-card-subtitle">
                      Average time from
                      ticket creation to
                      resolution
                    </span>

                  </div>

                  <div className="metric-icon">
                    <StatIcon type="clock" />
                  </div>

                </div>

                <div className="metric-value">
                  {formatDuration(
                    avgResolutionMinutes
                  )}
                </div>

              </div>

            </section>

            {/* =================================================
                TICKET TRENDS
            ================================================= */}

            <section className="dashboard-panel ticket-trends-panel">

              <div className="dashboard-panel-header">

                <div>

                  <h2>
                    Ticket Trends
                  </h2>

                  <p>
                    Tickets created and
                    resolved over the
                    last 7 days
                  </p>

                </div>

                <div className="ticket-trends-legend">

                  <div className="trend-legend-item">

                    <span className="trend-dot created" />

                    Created

                  </div>

                  <div className="trend-legend-item">

                    <span className="trend-dot resolved" />

                    Resolved

                  </div>

                </div>

              </div>

              <div
                className="ticket-trends-chart"
                ref={
                  ticketTrendRef
                }
              >

                <ResponsiveContainer
                  width="100%"
                  height={330}
                >

                  <LineChart
                    data={
                      ticketTrends
                    }

                    margin={{
                      top: 15,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="#edf0f4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#667085",
                        fontSize: 13,
                      }}
                      dy={10}
                    />

                    <YAxis
                      allowDecimals={
                        false
                      }
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#667085",
                        fontSize: 13,
                      }}
                      width={35}
                    />

                    <Tooltip
                      content={
                        <TicketTrendTooltip />
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        strokeWidth: 2,
                        fill: "#ffffff",
                      }}
                      activeDot={{
                        r: 7,
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="resolved"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        strokeWidth: 2,
                        fill: "#ffffff",
                      }}
                      activeDot={{
                        r: 7,
                      }}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            </section>

            {/* =================================================
                CATEGORY + PRIORITY
            ================================================= */}

            <section className="dashboard-main-grid">

              {/* CATEGORY */}

              <div className="dashboard-panel category-panel">

                <div className="dashboard-panel-header">

                  <div>

                    <h2>
                      Tickets by Category
                    </h2>

                    <p>
                      Distribution of
                      support requests
                    </p>

                  </div>

                </div>

                {categoryData.length ===
                0 ? (

                  <div className="dashboard-empty">
                    No category data
                    available.
                  </div>

                ) : (

                  <div className="category-content">

                    <div
                      className="category-chart-wrapper"
                      ref={
                        categoryChartRef
                      }
                    >

                      <div
                        className="category-donut"
                        style={{
                          background:
                            categoryGradient,
                        }}
                      >

                        <div className="category-donut-center">

                          <strong>
                            {
                              tickets.length
                            }
                          </strong>

                          <span>
                            Tickets
                          </span>

                        </div>

                      </div>

                    </div>

                    <div className="category-legend">

                      {categoryData.map(
                        (
                          category,
                          index
                        ) => (

                          <div
                            className="category-legend-item"
                            key={
                              category.name
                            }
                          >

                            <div className="category-legend-left">

                              <span
                                className="category-dot"
                                style={{
                                  backgroundColor:
                                    categoryColors[
                                      index %
                                        categoryColors.length
                                    ],
                                }}
                              />

                              <span>
                                {
                                  category.name
                                }
                              </span>

                            </div>

                            <div className="category-legend-right">

                              <strong>
                                {
                                  category.value
                                }
                              </strong>

                              <span>
                                {
                                  category.percentage
                                }
                                %
                              </span>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                )}

              </div>

              {/* PRIORITY */}

              <div className="dashboard-panel dashboard-priority-panel">

                <div className="dashboard-panel-header">

                  <div>

                    <h2>
                      Priority Overview
                    </h2>

                    <p>
                      Tickets by priority
                    </p>

                  </div>

                </div>

                <div className="priority-bars">

                  {priorityCounts.map(
                    (item) => {

                      const percentage =
                        tickets.length
                          ? Math.round(
                              (item.value /
                                tickets.length) *
                                100
                            )
                          : 0;

                      return (

                        <div
                          className="priority-bar-row"
                          key={
                            item.name
                          }
                        >

                          <div className="priority-bar-label">

                            <span>
                              {
                                item.name
                              }
                            </span>

                            <strong>
                              {
                                item.value
                              }
                            </strong>

                          </div>

                          <div className="priority-bar-track">

                            <div
                              className={`priority-bar-fill ${item.className}`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                          <span className="priority-percentage">
                            {percentage}%
                          </span>

                        </div>

                      );
                    }
                  )}

                </div>

              </div>

            </section>

            {/* =================================================
                AGENT PERFORMANCE
            ================================================= */}

            <section className="dashboard-panel agent-performance-panel">

              <div className="dashboard-panel-header">

                <div>

                  <h2>
                    Agent Performance
                  </h2>

                  <p>
                    Resolution performance
                    by support agent
                  </p>

                </div>

              </div>

              {agentPerformance.length ===
              0 ? (

                <div className="dashboard-empty">
                  No agent performance
                  data available.
                </div>

              ) : (

                <div className="agent-table-wrapper">

                  <table className="agent-performance-table">

                    <thead>

                      <tr>

                        <th>
                          Agent Name
                        </th>

                        <th>
                          Resolved
                        </th>

                        <th>
                          Avg Time
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {agentPerformance.map(
                        (agent) => (

                          <tr
                            key={
                              agent.name
                            }
                          >

                            <td>

                              <div className="agent-name-cell">

                                <div className="agent-avatar">

                                  {agent.name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}

                                </div>

                                <div className="agent-name-info">

                                  <strong>
                                    {
                                      agent.name
                                    }
                                  </strong>

                                  <span>
                                    Support Agent
                                  </span>

                                </div>

                              </div>

                            </td>

                            <td>

                              <span className="resolved-count">
                                {
                                  agent.resolved
                                }
                              </span>

                            </td>

                            <td>

                              <span className="agent-time">
                                {formatDuration(
                                  agent.avgTime
                                )}
                              </span>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          </>

        )}

      </div>

    </AppLayout>
  );
}

