import styles from './NavButton.module.css'
import { useNavigate } from 'react-router-dom'

export default function NavButton(props) {

    const navigate = useNavigate();

    function handleClick(){
        navigate(props.link);
    }

    let path = window.location.pathname;
    path = path.replaceAll('/','');
    console.log(path)
    let active = '';
    if((path==='')&&(props.link==='/')) active=styles.active;
    if(path==='tasks'&&(props.link==='/tasks')) active=styles.active;

    return(
        <div className={styles.btn_box}>
            <button className={`${styles.btn} ${active}`} onClick={()=>{handleClick()}}>{props.type}</button>
        </div>
    );
}
