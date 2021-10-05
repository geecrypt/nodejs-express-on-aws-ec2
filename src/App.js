import './App.css';
import axios from 'axios';
import { useEffect, useState } from 'react';

function App() {
  const [data, setData] = useState([])

  useEffect(() => {
    axios.get('/api/products')
      .then((res) => {
        console.log('res', res.data);
        setData(res.data.data)
      })
      .catch((e) => console.log('error /api/products GET', e));
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <ul>
          {data.map((d) => (
            <li key={d.id}>{d.name}</li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
