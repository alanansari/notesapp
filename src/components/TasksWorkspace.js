
import { useState } from 'react';
import styles from './TasksWorkspace.module.css'
import  NewContentBar from './AddContentBar'

export default function Tasks(){

    const [tasks,setTasks] = useState(JSON.parse(localStorage.getItem('saved_notes')) || []);

    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewContentBar msg='Create new task...' tasks={tasks} addTask={setTasks} type='task' />
            </div>
            <div className={styles.bottomchild}>
                
            </div>
        </div>
    );
}