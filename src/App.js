import './App.css';
import StickyNotes from './components/StickyNotes';
import Navbar from './components/Navbar';
import Tasks from './components/Tasks';
import { Route,Routes } from 'react-router-dom';

function App() {

  return (
    <div className="App">
      <Navbar/>
      <Routes>
        <Route path='/notesapp/tasks' element={ <Tasks /> } />
        <Route path='/'>
          <Route element={<StickyNotes/>} path=''/>
          <Route element={<StickyNotes/>} path='notesapp'/>
        </Route>
      </Routes>
    </div>
  );
}

export default App;
