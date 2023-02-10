import './App.css';
import StickyNotes from './components/StickyNotes';
import Navbar from './components/Navbar';
import Tasks from './components/Tasks';

function App() {

  let component;
  switch (window.location.pathname){
    case'/':
      component=<StickyNotes />
      window.location.pathname = '/notesapp';
      break;
    case'/tasks':
      component=<Tasks />
      break;
    default:
      component=<StickyNotes />
      break;
  }

  return (
    <div className="App">
      <Navbar/>
      {component}
    </div>
  );
}

export default App;
