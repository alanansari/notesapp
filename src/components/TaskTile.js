import React from 'react';
import styles from './TaskTile.module.css';
import {convertToMarkup} from '../utils/editDiv';

function doneTask(props){
    const tasks = props.tasks;
    const prior = tasks[props.index].done;
    tasks[props.index].done = !prior;
    props.setTasks([...tasks]);
    localStorage.setItem('saved_tasks',JSON.stringify(tasks));
}

function deleteTask(props){
    const tasks = props.tasks;
    tasks.splice(props.index,1);
    props.setTasks([...tasks]);
    localStorage.setItem('saved_tasks',JSON.stringify(tasks));
}

const TaskTile = (props) => {
  return (
    <div className={styles.tile}>
      <div className={styles.check}
        onClick={()=>{
            doneTask(props)
        }}>
      ✅
      </div>
      <div
        style={{textDecoration:(props.done===true?"line-through":"none")}} 
        className={styles.content}
        dangerouslySetInnerHTML={{__html: convertToMarkup(props.tile_obj.text)}}
      />
      <div
        onClick={()=>{
            deleteTask(props)
        }} 
        className={styles.cross}>
      ❌
      </div>
    </div>
  )
}

export default TaskTile
