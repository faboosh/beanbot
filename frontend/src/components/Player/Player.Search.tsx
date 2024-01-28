import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import PlayerAPI from "../../api/player";
import PlayerSearchResult, { TPlayerSearchResult } from "./Player.SearchResult";
import PlayerSidebar from "./Player.Sidebar";
import Loader from "../Loader";

const SearchWrapper = styled.div`
  width: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
`;

const SearchInputWrapper = styled.div`
  background: var(--gray-800);
  border-radius: 9999px;
`;
const TopBar = styled.div`
  background: var(--gray-900);
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  color: var(--gray-50);
  font-size: 0.8rem;
  font-weight: 400;
  width: 100%;
`;

const SearchResults = styled.div`
  min-height: 0;
  overflow-y: auto;
  height: 100%;
  position: relative;
  overflow-x: hidden;
`;

const ResultsWrapper = styled.div`
  min-height: 0;
  overflow-y: auto;
  height: 100%;
  position: relative;
`;

const EmptyState = styled.div`
  color: var(--gray-700);
  text-align: center;
`;

const Logo = styled.img`
  height: 2.5rem;
  margin: -0.5rem;
`;

const LogoText = styled.p`
  line-height: 1;
  font-size: 0.8rem;
  white-space: nowrap;
  margin: 0;
  font-weight: 600;
  text-shadow: 1px 1px 0px var(--gray-400), 2px 2px 0px var(--gray-500),
    3px 3px 0px var(--gray-600), 4px 4px 0px var(--gray-700);
`;

const PlayerSearch = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TPlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!search) return;
    if (!(search.length > 3)) return;

    const timeout = setTimeout(() => {
      setLoading(true);
      PlayerAPI.search(search).then((res) => {
        console.log(res);
        setResults(
          res.map((video: any) => {
            return {
              title: video.title.text,
              id: video.id,
              author: video.author.name,
              thumbnail: video.thumbnails?.[0]?.url ?? "",
              length: video.duration.text,
            } as TPlayerSearchResult;
          })
        );
        setLoading(false);
      });
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [search]);

  return (
    <SearchWrapper>
      <TopBar className="p-2 d-flex align-center gap-2 shadow-lg">
        <Logo src="/beanbot.png" />
        <LogoText>BeanBot</LogoText>
        <SearchInputWrapper className="d-flex align-center gap-2 py-2 px-3 w-100">
          <FontAwesomeIcon icon={faSearch} size="xs" />
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
          />
        </SearchInputWrapper>
      </TopBar>
      <SearchResults>
        <PlayerSidebar />
        <ResultsWrapper className="d-flex flex-column gap-2 p-2">
          {!loading &&
            results.map((result, i) => (
              <PlayerSearchResult
                result={result}
                key={result.id.concat(String(i))}
              />
            ))}

          {loading && (
            <div className="d-flex align-center justify-center w-100 h-100">
              <Loader size="5vw" />
            </div>
          )}

          {results.length === 0 && !loading && (
            <EmptyState className="d-flex align-center justify-center w-100 h-100">
              <h1>
                Search for something!!!
                <br />
                <br /> (╯°□°）╯︵ ┻━┻{" "}
              </h1>
            </EmptyState>
          )}
        </ResultsWrapper>
      </SearchResults>
    </SearchWrapper>
  );
};

export default PlayerSearch;
