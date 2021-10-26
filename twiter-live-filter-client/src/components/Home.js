import { React, useState, useEffect } from 'react';
import needle from 'needle';

export default function Home() {
  const baseUrl = 'http://localhost:3002/filter'
  const [queries, setQueries] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [tweets, setTweets] = useState([]);
  const textDecoder = new TextDecoder("utf-8");
  

  function stringToJSON(string) {
    let parsedData = [];

    if (string.match(/"data":/g).length > 1) {
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

    function updateTweets() {   
      const stream = needle.get(baseUrl);
      stream
      .on('data', (data) => {
        const parsedData = stringToJSON(textDecoder.decode(data));
        setTweets(tweets => [ ...parsedData, ...tweets ]);
      })
      .on('err', (err) => {
        console.log(err);
      })
      .on('done', () => {
        setQueries('');
      });
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateTweets();
  }

  function handleQueriesChanged(e) {
    setQueries(e.target.value);

    let queryUrl = '?';
    let queryCount = 0;
    const queryList = queries.split(',');

    queryList.forEach((query) => {
      queryCount++;
      queryUrl += `query${queryCount}=${query.trim()}&`;
    });
    queryUrl = queryUrl.slice(0, queryUrl.length - 1);
    setApiUrl(baseUrl + queryUrl);
  }

  useEffect(() => {}, [tweets]);

  return (
    <>
      <div className="bg-blue-400 h-screen block">
        <div className="h-44 w-full flex justify-center items-end">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Enter comma separated queries (Ex: query1,query2)"
              value={queries}
              onChange={(e) => {handleQueriesChanged(e)}}
              className="h-12 w-search rounded-lg text-xl px-4"
            />
            <button
              type="submit"
              className="bg-gray-300 w-28 h-12 rounded-lg ml-6 text-xl hover:bg-gray-200"
            >
              Search
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
                {tweet.text}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
