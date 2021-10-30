import { React, useState, useEffect, useRef } from 'react';
import parse from 'html-react-parser';

export default function Home() {
  const baseUrl = `http://${window.location.hostname}:3002/filter`;
  const [queries, setQueries] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [tweets, setTweets] = useState([]);
  const [searching, setSearching] = useState(false);
  const fetchController = new AbortController();
  const response = useRef(null);

  function stringToJSON(string) {
    let parsedData = [];

    if (string.match(/"data":/g)?.length > 1) {
      let index1 = string.indexOf('"data":') - 1;
      let index2 = string.indexOf('"data":', index1 + 8) - 1;

      while (index1 !== string.length) {
        parsedData.push(JSON.parse(string.slice(index1, index2)).data);
        index1 = index2;
        const nextIndex = string.indexOf('"data":', index1 + 8) - 1;
        index2 = nextIndex > 0 ? nextIndex : string.length;
      }

      return parsedData;
    }

    return [JSON.parse(string).data];
  }

  async function startFilter(e) {
    e.preventDefault();

    let queryUrl = '?';
    let queryCount = 0;
    const queryList = queries.split(',');

    queryList.forEach((query) => {
      if (query.trim()) {
        queryCount++;
        queryUrl += `query${queryCount}=${query.trim()}&`;
      }
    });
    queryUrl = queryUrl.slice(0, queryUrl.length - 1);

    if (queryCount > 0) {
      setApiUrl(baseUrl + queryUrl);
      setSearching(true);
    }
    else alert('Error: Minimum of 5 queries required.');
  }

  function stopFilter(e) {
    e.preventDefault();
    fetchController.abort();
    setSearching(false);
    setQueries('');
  }

  useEffect(() => {
    (async () => {
      if (searching) {
        try {
          response.current = await fetch(apiUrl, { signal: fetchController.signal });
          const reader = response.current.body.getReader();
          const textDecoder = new TextDecoder("utf-8");

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const parsedData = stringToJSON(textDecoder.decode(value));

            parsedData.forEach((tweet) => {
              console.log(tweet.text);
              console.log(tweet.matches);
              tweet.matches.forEach((word) => {
                tweet.text =
                  tweet.text.replaceAll(
                    new RegExp(word, 'g'), `<mark style='background-color: #1DA1F2'>${word}</mark>`
                  );
              });
              console.log(tweet.text);
            });

            setTweets(tweets => [ ...parsedData, ...tweets ]);
          }
        } catch(err) {
          console.log(err);
        }

      }
    })();
  }, [apiUrl, searching, fetchController.signal]);

  return (
    <>
      <div className="bg-blue-400 h-screen block">
        <div className="h-44 w-full flex justify-center items-end">
          <form className="flex" onSubmit={(e) => startFilter(e)}>
            <input
              type="text"
              placeholder="Enter comma separated queries (Ex: query1, query2)"
              value={queries}
              onChange={(e) => {setQueries(e.target.value)}}
              className="h-12 w-search rounded-lg text-xl px-4"
            />
            <button
              type="submit"
              className="bg-gray-300 w-28 h-12 rounded-lg ml-4 text-xl hover:bg-gray-200 grid place-content-center"
            >
              {searching ?
                <div
                  style={{borderTopColor: 'transparent'}}
                  className="w-6 h-6 border-4 border-black border-dashed rounded-full animate-spin">
                </div> :
               'Search'
              }
            </button>
            <button
              onClick={(e) => {stopFilter(e)}}
              className="bg-red-500 w-28 h-12 rounded-lg ml-4 text-xl hover:bg-red-400 grid place-content-center"
            >
              Stop
            </button>
          </form>
        </div>
        <div className="grid grid-cols-3 pt-24 pb-12 bg-blue-400">
          {tweets.map((tweet) => {
            return (
              <div
                 key={tweet.id}
                 className="h-44 w-card bg-white rounded-2xl m-auto px-4 my-4 grid place-items-center"
                >
                <span>
                  {parse(tweet.text)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
