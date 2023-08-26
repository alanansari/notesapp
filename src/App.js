import './App.css';
import StickyNotesWorkspace from './components/StickyNotesWorkspace';
import Navbar from './components/Navbar';
import TasksWorkspace from './components/TasksWorkspace';
import { Route,Routes } from 'react-router-dom';

function App() {

  return (
    <div className="App">
      <Navbar/>
      <Routes>
        <Route path='/notesapp/tasks' element={ <TasksWorkspace /> } />
        <Route path='/'>
          <Route element={<StickyNotesWorkspace/>} path=''/>
        </Route>
      </Routes>
    </div>
  );
}

export default App;
