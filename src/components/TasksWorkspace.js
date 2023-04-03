
import { useState } from 'react';
import styles from './TasksWorkspace.module.css'
import  NewContentBar from './AddContentBar'
import TaskTile from './TaskTile'

export default function Tasks(){

    const [tasks,setTasks] = useState(JSON.parse(localStorage.getItem('saved_tasks')) || []);

    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewContentBar msg='Create new task...' tasks={tasks} addTask={setTasks} type='task' />
            </div>
            <div className={styles.bottomchild}>
                <div className={styles.midtext}>INCOMPLETE TASKS</div>
                <div className={styles.row}>
                    {tasks.map((task,i) => {
                            if(task.done===false)
                            return <TaskTile key={crypto.randomUUID()} index={i} tasks={tasks} tile_obj={task} setTasks={setTasks} done={task.done}/>
                            else
                            return <></>
                        })}
                </div>
                <div className={styles.midtext}>COMPLETED TASKS</div>
                <div className={styles.row}>
                    {tasks.map((task,i) => {
                            if(task.done===true)
                            return <TaskTile key={crypto.randomUUID()} index={i} tasks={tasks} tile_obj={task} setTasks={setTasks} done={task.done}/>
                            else
                            return <></>
                        })}
                </div>
            </div>
        </div>
    );
}