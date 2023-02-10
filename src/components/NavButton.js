import styles from './NavButton.module.css'
import { useNavigate } from 'react-router-dom'

export default function NavButton(props) {

    const navigate = useNavigate();

    function handleClick(){
        navigate(props.link);
    }

    const path = window.location.pathname;
    
    let active = path!=='/'&&(props.link.match(path))?styles.active:'';
    if(path==='/'&&props.link==='/notesapp') active=styles.active;

    return(
        <div className={styles.btn_box}>
            <button className={`${styles.btn} ${active}`} onClick={()=>{handleClick()}}>{props.type}</button>
        </div>
    );
}
