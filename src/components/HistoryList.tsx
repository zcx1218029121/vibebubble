import { useState, useMemo } from "react";
import type { HistoryItem } from "../types";
import { formatTime } from "../utils";
import { useClipboard } from "../hooks/useClipboard";
import { useToast } from "../hooks/useToast";

interface HistoryListProps {
  history: HistoryItem[];
  onDelete: (id: number) => void;
  onClear: () => void;
  onToggleFavorite?: (id: number, favorite: boolean) => void;
  compact?: boolean;
}

export function HistoryList({ history, onDelete, onClear, onToggleFavorite, compact }: HistoryListProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<HistoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTemplate, setFilterTemplate] = useState<string>("全部");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { copyToClipboard } = useClipboard();
  const { toast, showToast } = useToast();

  // Get unique template names for filter
  const templateNames = useMemo(() => {
    const names = new Set<string>();
    history.forEach(item => names.add(item.template_name));
    return ["全部", ...Array.from(names)];
  }, [history]);

  // Filter history
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Search filter
      if (searchQuery && !item.input.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.output_preview.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Template filter
      if (filterTemplate !== "全部" && item.template_name !== filterTemplate) {
        return false;
      }
      // Favorites filter
      if (showFavoritesOnly && !item.favorite) {
        return false;
      }
      return true;
    });
  }, [history, searchQuery, filterTemplate, showFavoritesOnly]);

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    showToast(ok ? `${label}已复制` : "复制失败");
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-4xl mb-2">📭</p>
        <p>暂无历史记录</p>
        {!compact && <p className="text-xs mt-1">转换后的内容会保存在这里</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {!compact && (
        <>
          {/* Search and Filter Bar */}
          <div className="space-y-2 mb-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索历史记录..."
                  className="w-full bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="bg-gray-700 rounded-lg p-2 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templateNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFavoritesOnly}
                  onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-600 border-gray-500"
                />
                ⭐ 只看收藏
              </label>
              <span className="text-xs text-gray-500">
                共 {filteredHistory.length} 条记录
              </span>
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onClear}
              className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
            >
              清空全部
            </button>
          </div>
        </>
      )}

      <div className={`space-y-2 ${compact ? "" : "max-h-[400px]"} overflow-y-auto`}>
        {filteredHistory.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            没有找到匹配的历史记录
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700/30 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Header */}
              <div
                className={`p-2 flex items-center justify-between cursor-pointer hover:bg-gray-700/50 ${compact ? "" : ""}`}
                onClick={() => {
                  if (compact) {
                    setSelectedDetail(item);
                  } else {
                    setExpanded(expanded === item.id ? null : item.id);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (compact) setSelectedDetail(item);
                    else setExpanded(expanded === item.id ? null : item.id);
                  }
                }}
                aria-label={`历史记录: ${item.input.slice(0, 30)}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(item.id, !item.favorite);
                    }}
                    className={`text-sm ${item.favorite ? "text-yellow-400" : "text-gray-500 hover:text-yellow-400"}`}
                    aria-label={item.favorite ? "取消收藏" : "收藏"}
                  >
                    {item.favorite ? "⭐" : "☆"}
                  </button>
                  <span className="text-xs text-gray-500">{formatTime(item.timestamp)}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded">
                    {item.template_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(item.output_preview, "输出");
                    }}
                    className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                    aria-label="复制输出"
                  >
                    复制
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded transition-colors"
                    aria-label="删除记录"
                  >
                    删除
                  </button>
                  {!compact && (
                    <span className="text-gray-500 text-xs">
                      {expanded === item.id ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Content (non-compact mode) */}
              {!compact && expanded === item.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50">
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">输入：</span>
                      <button
                        onClick={() => handleCopy(item.input, "输入")}
                        className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">{item.input}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">输出：</span>
                      <button
                        onClick={() => handleCopy(item.output_preview, "输出")}
                        className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{item.output_preview}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detail Modal (compact mode) */}
      {compact && selectedDetail && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="bg-gray-800 rounded-xl w-[500px] max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gray-200">历史详情</h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-white text-xl"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span>{formatTime(selectedDetail.timestamp)}</span>
                <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded">
                  {selectedDetail.template_name}
                </span>
                {selectedDetail.favorite && <span className="text-yellow-400">⭐</span>}
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">输入：</span>
                  <button
                    onClick={() => handleCopy(selectedDetail.input, "输入")}
                    className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                  >
                    复制
                  </button>
                </div>
                <p className="text-sm text-gray-300 break-words whitespace-pre-wrap mt-1 bg-gray-700/50 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  {selectedDetail.input}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">输出：</span>
                  <button
                    onClick={() => handleCopy(selectedDetail.output_preview, "输出")}
                    className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                  >
                    复制
                  </button>
                </div>
                <p className="text-sm text-gray-300 break-words whitespace-pre-wrap mt-1 bg-gray-700/50 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                  {selectedDetail.output_preview}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
