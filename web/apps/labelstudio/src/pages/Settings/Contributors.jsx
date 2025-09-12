import { useCallback, useEffect, useState } from "react";
import { Toggle } from "../../components/Form";
import { confirm } from "../../components/Modal/Modal";
import { Pagination } from "../../components/Pagination/Pagination";
import { Spinner } from "../../components/Spinner/Spinner";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";

export const Contributors = () => {
  const { project } = useProject();
  const api = useAPI();
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [keyword, setKeyword] = useState("");

  const fetchContributors = useCallback(async (page, size, searchKeyword = keyword) => {
    if (!project?.id) return;
    
    setLoading(true);
    try {
      const response = await api.callApi("projectContributors", {
        params: {
          pk: project.id,
          page,
          page_size: size,
          keyword: searchKeyword,
        },
      });
      
      if (response.results) {
        setContributors(response.results);
        setTotalItems(response.count);
      }
    } catch (error) {
      console.error("Failed to fetch contributors:", error);
    } finally {
      setLoading(false);
    }
  }, [api, project?.id, keyword]);

  useEffect(() => {
    fetchContributors(currentPage, pageSize);
  }, [fetchContributors, currentPage, pageSize]);

  const handleToggleChange = useCallback(async (contributor, newValue) => {
    if (newValue) {
      try {
        await api.callApi("addProjectContributor", {
          params: { pk: project.id },
          body: { 
            action: 'add',
            email: contributor.email 
          }
        });
        
        fetchContributors(currentPage, pageSize, keyword);
      } catch (error) {
        console.error("Failed to add contributor:", error);
      }
    } else {
      try {
        await api.callApi("removeProjectContributor", {
          params: { pk: project.id },
          body: { 
            action: 'remove',
            email: contributor.email 
          }
        });
        
        fetchContributors(currentPage, pageSize, keyword);
      } catch (error) {
        console.error("Failed to remove contributor:", error);
      }
    }
  }, [contributors, currentPage, pageSize, fetchContributors, api, project.id]);

  const handlePageChange = useCallback((page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  if (loading && contributors.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div style={{ padding: "10px" }}>
      
      {/* Search Section */}
      <div style={{ 
        marginBottom: "10px",
      }}>
        <input
          type="text"
          placeholder="Search by email..."
          value={keyword}
          onChange={(e) => {
            const newKeyword = e.target.value;
            setKeyword(newKeyword);
            // Reset to first page and search immediately
            setCurrentPage(1);
            fetchContributors(1, pageSize, newKeyword);
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none"
          }}
        />
      </div>
      
      <div style={{ 
        backgroundColor: "white", 
        borderRadius: "8px", 
        border: "1px solid #e5e7eb",
        overflow: "hidden"
      }}>

        {/* Table Body */}
        {contributors.length === 0 ? (
          <div style={{ 
            padding: "10px", 
            textAlign: "center", 
            color: "#6b7280",
            fontSize: "14px"
          }}>
            No contributors found
          </div>
        ) : (
          contributors.map((contributor) => (
            <div
              key={contributor.user_id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px",
                gap: "16px",
                padding: "10px",
                borderBottom: "1px solid #f5f5f5",
                alignItems: "center"
              }}
            >
              <div style={{ 
                fontSize: "14px", 
                color: "#111827",
                wordBreak: "break-word"
              }}>
                {contributor.email}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle
                  checked={contributor.joined === 1}
                  onChange={(e) => handleToggleChange(contributor, e.target.checked)}
                  aria-label={`Toggle ${contributor.email} membership`}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalItems > pageSize && (
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
          <Pagination
            page={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onChange={handlePageChange}
            onPageLoad={fetchContributors}
          />
        </div>
      )}
    </div>
  );
};

Contributors.title = "Contributors";
Contributors.path = "/contributors";
