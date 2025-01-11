document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

});

const week_days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const dish_types = ['салат', 'первое', 'второе', 'напиток', 'десерт'];

class App {
    #menus = [];
    #dishs = [];

    onKeyDownEscape = (event) => {
        if (event.key !== 'Escape') return;
        const input_day = document.getElementById('add-menu-input-day');
        input_day.style.display = 'none';
        input_day.value = '';

        document.getElementById('add-menu-btn').style.display = 'initial';
    };

    onKeyDownEnter = async (event) => {
        if (event.key !== 'Enter') return;
        const input_day = document.getElementById('add-menu-input-day');
        if (input_day.value !== '') {
            try {
                const res = await fetch("/api/v1/menus", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify({
                        menuID: crypto.randomUUID(),
                        menuDay: input_day.value
                    })
                }).then(res => res.json());
                const newMenu = new Menu ({
                    menuID: res.new_menu.id,
                    menuDay: res.new_menu.day,
                    menuNum: res.new_menu.num,
                    dishs: [],
                    onAddDish: this.onAddDish,
                    onEditMenu: this.onEditMenu,
                    onDeleteMenu: this.onDeleteMenu
                }); 
                newMenu.render(this.getMenuPos({menuDay: newMenu.menuDay, menuNum: newMenu.menuNum}));
                this.#menus.splice(this.getMenuPos({menuDay: newMenu.menuDay, menuNum: newMenu.menuNum}), 0, newMenu);
            } catch (err) {
                console.error(err);
            }
            input_day.value = '';
        }
        input_day.style.display = 'none';
        document.getElementById('add-menu-btn').style.display = 'initial';
    };

    onEditMenu = async ({menuID}) => {
        const menuInd = this.#menus.findIndex((el) => el.menuID === menuID);
        document.querySelector(`li[id="${menuID}"] > div`).style.display = 'none';

        const formMenuEl = document.createElement('div');
        formMenuEl.classList.add('menu-form');
        formMenuEl.id = menuID;

        const selFormDayEl = document.createElement('select');
        selFormDayEl.classList.add('menu__day');
        week_days.forEach(type => {
            const optFormDayEl = document.createElement('option');
            optFormDayEl.value = week_days.indexOf(type);
            optFormDayEl.innerHTML = type;
            selFormDayEl.appendChild(optFormDayEl);
        });
        formMenuEl.appendChild(selFormDayEl);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('menu__controls');

        DishBtnParams.slice(2, 4).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);

            switch(type) {
                case DishBtnTypes.EDIT_DISH:
                    buttonEl.addEventListener('click', async () => {
                        const newDay = Number(selFormDayEl.value);
                        if (newDay < 0 || newDay > 6) {
                            alert('Че, как ты ввел неправильный день..? >:(');
                            return;
                        }

                        try {
                            const res = await fetch(`/api/v1/menus/${menuID}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json; charset=utf-8'
                                },
                                body: JSON.stringify({
                                    menuDay: newDay
                                })
                            }).then(res => res.json());

                            let menu = this.#menus[menuInd];
                            menu.menuDay = res.day;
                            menu.menuNum = res.num;
                            this.#menus.splice(menuInd, 1);
                            document.querySelector(`li[id="${menuID}"]`).remove();
                            menu.render(this.getMenuPos({
                                menuDay: menu.menuDay,
                                menuNum: menu.menuNum
                            }));
                            menu.dishs.forEach((dishID) => {
                                this.#dishs.find((dish) => dish.dishID === dishID).render(menu.menuID, this.getDishPos({
                                    dishs: menu.dishs,
                                    dish: this.#dishs.find(el => el.dishID === dishID)
                                }));
                            })
                            this.#menus.splice(
                                this.getMenuPos({
                                    menuDay: menu.menuDay,
                                    menuNum: menu.menuNum
                                }), 
                                0,
                                menu
                            )
                        } catch (err) {
                            console.error(err);
                        }
                    });
                    break;
                case DishBtnTypes.DELETE_DISH:
                    buttonEl.addEventListener('click', () => {
                        document.querySelector(`li[id="${menuID}"] > div.menu-form`).remove();
                        document.querySelector(`li[id="${menuID}"] > div`).style.display = 'flex';
                    });
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });

        formMenuEl.appendChild(controlsEl);
        document.querySelector(`li[id="${menuID}"]`)
            .insertBefore(formMenuEl, document.querySelector(`li[id="${menuID}"]`).children[1]);
    
    }

    onDeleteMenu = async ({menuID}) => {
        const menu = this.#menus.find(menu => menu.menuID === menuID);
        if (!menu) {
            console.error('нет меню');
            return;
        }

        const menuIsDeleted = confirm(`Меню '${week_days[menu.menuDay]} №${menu.menuNum + 1}' будет удалено. Ок?`);
        if (!menuIsDeleted) return;

        try{
            const res = await fetch(`/api/v1/menus/${menuID}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            })
            this.#menus.splice(this.#menus.findIndex(el => el.menuID === menuID), 1);
            document.querySelector(`li[id="${menuID}"]`).remove();
        } catch (err) {
            console.error(err);
        }
    };

    onEditDish = ({menuID, dishID}) => {
        const dishInd = this.#dishs.findIndex((el) => el.dishID === dishID);
        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li[id="${dishID}"]`).style.display = 'none';

        const formdishEl = document.createElement('li');
        formdishEl.classList.add('dish-form');
        formdishEl.id = dishID;

        const forminfoEl = document.createElement('ul');

        const liFormNameEl = document.createElement('li'), 
            inpFormNameEl = document.createElement('input');
        liFormNameEl.classList.add('dish__name');
        inpFormNameEl.classList.add('dish__name');
        inpFormNameEl.type = 'text';
        inpFormNameEl.value = this.#dishs[dishInd].dishName;
        inpFormNameEl.placeholder = 'Название блюда';
        liFormNameEl.appendChild(inpFormNameEl);
        forminfoEl.appendChild(liFormNameEl);

        const liFormTypeEl = document.createElement('li'), 
            selFormTypeEl = document.createElement('select');
        liFormTypeEl.classList.add('dish__name');
        selFormTypeEl.classList.add('dish__name');
        dish_types.forEach(type => {
            const optFormTypeEl = document.createElement('option');
            optFormTypeEl.value = dish_types.indexOf(type);
            optFormTypeEl.innerHTML = type;
            selFormTypeEl.appendChild(optFormTypeEl);
        });
        liFormTypeEl.appendChild(selFormTypeEl);
        forminfoEl.appendChild(liFormTypeEl);
        formdishEl.appendChild(forminfoEl);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('dish__controls');

        DishBtnParams.slice(2, 4).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);

            switch(type) {
                case DishBtnTypes.EDIT_DISH:
                    buttonEl.addEventListener('click', async () => {
                        const newName = inpFormNameEl.value, 
                            newType = Number(selFormTypeEl.value);
                        if (!newName) {
                            alert('Введите название блюда >:(');
                            return;
                        }
                        if (newType === NaN || newType > 4 || newType < 0) {
                            alert('Неверный тип блюда >:(');
                            return;
                        }
                        if (newType !== this.#dishs[dishInd].dishType) {
                            for (var menu of this.#menus) {
                                if ((menu.dishs.find(el => el === this.#dishs[dishInd].dishID) !== undefined) && this.isTypeAcqd({menuID: menu.menuID, dishID: dishID, dishType: newType})) {
                                    alert('Данный тип блюда занят >:(');
                                    return;
                                }
                            }
                        }
                        
                        try {
                            const res = await fetch(`/api/v1/dishs/${dishID}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json; charset=utf-8'
                                },
                                body: JSON.stringify({
                                    dishName: newName,
                                    dishType: newType
                                })
                            });
                            this.#dishs[dishInd].dishName = newName;
                            this.#dishs[dishInd].dishType = newType;
                            this.#menus.forEach(menu => {
                                const curDishInd = menu.dishs.findIndex(el => el === dishID);
                                if (curDishInd !== -1) {
                                    menu.dishs.splice(curDishInd, 1);
                                    document.querySelector(`li[id="${menu.menuID}"] > ul.menu__dishs-list > li.dish[id="${dishID}"]`).remove();
                                    this.#dishs[dishInd].render(
                                        menu.menuID, this.getDishPos({
                                            dishs: menu.dishs,
                                            dish: this.#dishs[dishInd]
                                        })
                                    );
                                    menu.dishs.splice(
                                        this.getDishPos({
                                            dishs: menu.dishs,
                                            dish: this.#dishs[dishInd]
                                        }), 
                                        0, 
                                        this.#dishs[dishInd].dishID
                                    );
                                }
                            });
                            document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li.dish-form[id="${dishID}"]`).remove();
                        } catch (err) {
                            console.error(err);
                        }
                    });
                    break;
                case DishBtnTypes.DELETE_DISH:
                    buttonEl.addEventListener('click', () => {
                        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li.dish-form[id="${dishID}"]`).remove();
                        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li[id="${dishID}"]`).style.display = 'flex';
                    });
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });

        formdishEl.appendChild(controlsEl);
        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list`)
            .appendChild(formdishEl);
    }; 

    onDeleteDish = async ({dishID, menuID}) => {
        const menu = this.#menus.find(menu => menu.menuID === menuID);
        if (!menu) {
            console.error('нет меню');
            return;
        }

        const dish = menu.dishs.find((el) => el === dishID);
        if (!dish) {
            console.error('нет блюда');
            return;
        }

        const dishIsDeleted = confirm(`Блюдо '${this.#dishs.find(el => el.dishID === dishID).dishName}' будет удалено из меню \"${week_days[menu.menuDay]} №${menu.menuNum + 1}\". Ок?`);
        if (!dishIsDeleted) return;

        try {
            await fetch('/api/v1/dishs2menus', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    menuID: menuID,
                    dishID: dishID
                })
            });
            menu.deleteDish({dishID});
            document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li[id="${dishID}"]`).remove();
        } catch (err) {
            console.error(err);
        }
    };

    onMoveDish = async ({menuID, dishID, direction}) => {
        if (direction !== DishBtnTypes.MOVE_DISH_FORWARD && direction !== DishBtnTypes.MOVE_DISH_BACK)
            return;
        const srcMenuIndex = this.#menus.findIndex(menu => menu.menuID === menuID);
        if (srcMenuIndex === -1) {
            console.error('No menu');
            return;
        }
        const movingDish = this.#menus[srcMenuIndex].dishs.findIndex((dish) => dish.dishID === dishID);
        if (!movingDish) {
            console.error('No dish');
            return;
        }
        const destMenuIndex = direction === DishBtnTypes.MOVE_DISH_BACK
            ? srcMenuIndex - 1
            : srcMenuIndex + 1;
        if (destMenuIndex === -1 || destMenuIndex === this.#menus.length) return;
        if (this.#menus[destMenuIndex].dishs.find(el => el === dishID) !== undefined) {
            alert('Такое блюдо уже есть в меню назначения');
            return;
        }
        if (this.isTypeAcqd({menuID: this.#menus[destMenuIndex].menuID, dishID: dishID})) {
            alert('Такой тип блюда уже есть в меню назначения');
            return;
        }

        try {
            await fetch('/api/v1/dishs2menus', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    menusrcID: menuID,
                    dishID: dishID,
                    menudstID: this.#menus[destMenuIndex].menuID
                })
            });
            this.#menus[srcMenuIndex].dishs.splice(movingDish, 1);
            document.querySelector(`li[id="${this.#menus[srcMenuIndex].menuID}"] > ul.menu__dishs-list > li[id="${dishID}"]`)
                .remove();
            this.#dishs.find((dish) => dish.dishID === dishID)
                .render(
                    this.#menus[destMenuIndex].menuID, this.getDishPos({
                        dishs: this.#menus[destMenuIndex].dishs,
                        dish: this.#dishs.find((dish) => dish.dishID === dishID)
                    })
            );
            this.#menus[destMenuIndex].addDish({dishID: dishID, dishInd: this.getDishPos({
                dishs: this.#menus[destMenuIndex].dishs,
                dish: this.#dishs.find((dish) => dish.dishID === dishID)
            })});
        } catch (err) {
            console.error(err);
        }
    };

    onAddDish = ({menuID}) => {
        document.querySelector(`li[id="${menuID}"] > button`).style.display = 'none';

        const formdishEl = document.createElement('li');
        formdishEl.classList.add('dish-form');
        formdishEl.id = "-1";

        const forminfoEl = document.createElement('ul');

        const liFormNameEl = document.createElement('li'), 
            inpFormNameEl = document.createElement('input');
        liFormNameEl.classList.add('dish__name');
        inpFormNameEl.classList.add('dish__name');
        inpFormNameEl.type = 'text';
        inpFormNameEl.placeholder = 'Название блюда';
        liFormNameEl.appendChild(inpFormNameEl);
        forminfoEl.appendChild(liFormNameEl);

        const liFormTypeEl = document.createElement('li'), 
            selFormTypeEl = document.createElement('select');
        liFormTypeEl.classList.add('dish__name');
        selFormTypeEl.classList.add('dish__name');
        dish_types.forEach(type => {
            const optFormTypeEl = document.createElement('option');
            optFormTypeEl.value = dish_types.indexOf(type);
            optFormTypeEl.innerHTML = type;
            selFormTypeEl.appendChild(optFormTypeEl);
        });
        liFormTypeEl.appendChild(selFormTypeEl);
        forminfoEl.appendChild(liFormTypeEl);
        formdishEl.appendChild(forminfoEl);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('dish__controls');

        DishBtnParams.slice(2, 4).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);

            switch(type) {
                case DishBtnTypes.EDIT_DISH:
                    buttonEl.addEventListener('click', async () => {
                        const newName = inpFormNameEl.value, 
                            newType = Number(selFormTypeEl.value);

                        if (!newName) {
                            alert('Введите название блюда >:(');
                            return;
                        }
                        if (newType === NaN || newType > 4 || newType < 0) {
                            alert('Неверный тип блюда >:(');
                            return;
                        }
                        if (this.isTypeAcqd({menuID: menuID, dishType: newType})) {
                            alert('Данный тип блюда занят >:(');
                            return;
                        }

                        const dishExist = this.#dishs.find(el => el.dishName === newName);
                        let newDish;
                        if (dishExist !== undefined) {
                            if (dishExist.dishType != newType) {
                                alert('Блюдо с таким названием другого типа уже существует. \nУкажите правильный тип блюда или измените название');
                                return;
                            }
                            if (this.#menus.find(el => el.menuID === menuID).dishs.find(el => el === dishExist.dishID) !== undefined) {
                                alert('Такое блюдо уже есть в меню');
                                return;
                            }
                            newDish = dishExist;
                        } else {
                        newDish = new Dish({
                                dishID: crypto.randomUUID(),
                                dishName: newName,
                                dishType: newType,
                                onDeleteDish: this.onDeleteDish,
                                onMoveDish: this.onMoveDish,
                                onEditDish: this.onEditDish
                            });
                            try {
                                await fetch(`/api/v1/dishs`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json; charset=utf-8'
                                    },
                                    body: JSON.stringify({
                                        dishID: newDish.dishID,
                                        dishName: newDish.dishName,
                                        dishType: newDish.dishType
                                    })
                                });
                                this.#dishs.push(newDish);
                            } catch (err) {
                                console.error(err);
                            }
                        }

                        try {
                            await fetch(`/api/v1/dishs2menus`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json; charset=utf-8'
                                    },
                                    body: JSON.stringify({
                                        menuID: menuID,
                                        dishID: newDish.dishID
                                    })
                            });
                            document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li.dish-form[id="-1"]`).remove();
                            newDish.render(menuID, this.getDishPos({
                                dishs: this.#menus.find(el => el.menuID === menuID).dishs,
                                dish: newDish
                            }));
                            this.#menus[this.#menus.findIndex(el => el.menuID === menuID)].addDish({
                                dishID: newDish.dishID, 
                                dishInd: this.getDishPos({
                                    dishs: this.#menus.find(el => el.menuID === menuID).dishs,
                                    dish: newDish
                                })
                            });
                            document.querySelector(`li[id="${menuID}"] > button`).style.display = 'initial';
                        } catch (err) {
                            console.error(err);
                        }
                    });
                    break;
                case DishBtnTypes.DELETE_DISH:
                    buttonEl.addEventListener('click', () => {
                        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list > li.dish-form[id="-1"]`).remove();
                        document.querySelector(`li[id="${menuID}"] > button`).style.display = 'initial';
                    });
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });

        formdishEl.appendChild(controlsEl);
        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list`)
            .appendChild(formdishEl);
    };

    isTypeAcqd = ({menuID, dishID, dishType}) => {
        var flag = false;
        var type;
        if (dishType === undefined)
            type = this.#dishs.find(el => el.dishID === dishID).dishType;
        else 
            type = dishType;

        for (const dish of this.#menus.find(el => el.menuID === menuID).dishs) {
            if ((this.#dishs.find(el => el.dishID === dish).dishType == type) && (dishID !== this.#dishs.find(el => el.dishID === dish).dishID)) {
                flag = true;
                break;
            }
        }
        return flag;
    }

    getMenuPos = (({menuDay, menuNum}) => {
        if (this.#menus.length === 0) return 0;
        for (var menu of this.#menus) {
            if (menuDay < menu.menuDay || (menuDay === menu.menuDay && menuNum < menu.menuNum)) {
                return this.#menus.findIndex(el => el === menu);
            }
        }
        return this.#menus.length;
    });

    getDishPos = (({dishs, dish}) => {
        if (dishs.length === 0) return 0;
        for (var curDish of dishs) {
            if (dish.dishType < this.#dishs.find(el => el.dishID === curDish).dishType) {
                return dishs.findIndex(el => el === curDish);
            }
        }
        return dishs.length;
    });

    async init() {
        document.getElementById('add-menu-btn')
            .addEventListener('click', (event) => {
                event.target.style.display = 'none';

                const input = document.getElementById('add-menu-input-day');

                input.style.display = 'initial';
                input.focus();
            })
        document.addEventListener('keydown', this.onKeyDownEscape);
        document.addEventListener('keydown', this.onKeyDownEnter);

        try {
            const menus = await fetch("/api/v1/menus", {
                method: "GET"
            }).then(menus => menus.json());
            const dishs = await fetch("/api/v1/dishs", {
                method: "GET"
            }).then(dishs => dishs.json());
            
            dishs.dishs.forEach((dish) => {
                const newDish = new Dish({
                    dishID: dish.dishID, 
                    dishName: dish.dishName, 
                    dishType: dish.dishType, 
                    onEditDish: this.onEditDish,
                    onDeleteDish: this.onDeleteDish,
                    onMoveDish: this.onMoveDish
                })
                this.#dishs.push(newDish);
            });

            menus.menus.forEach((menu) => {
                const newMenu = new Menu({
                    menuID: menu.menuID, 
                    menuDay: menu.menuDay, 
                    menuNum: menu.menuNum, 
                    dishs: menu.dishs,
                    onAddDish: this.onAddDish,
                    onEditMenu: this.onEditMenu,
                    onDeleteMenu: this.onDeleteMenu
                })
                newMenu.render(this.getMenuPos({
                    menuDay: newMenu.menuDay,
                    menuNum: newMenu.menuNum
                }));
                this.#menus.push(newMenu);
                if (newMenu.dishs) {
                    newMenu.dishs.forEach((dishID) => {
                        this.#dishs.find((dish) => dish.dishID === dishID).render(newMenu.menuID, this.getDishPos({
                            dishs: newMenu.dishs,
                            dish: this.#dishs.find(el => el.dishID === dishID)
                        }));
                    })
                }
            });
        } catch (err) {
            console.error(err);
        }
    }
}

class Menu {
    #menuID = '';
    #menuDay = -1;
    #menuNum = -1;
    #dishs = [];

    constructor({menuID, menuDay, menuNum, dishs, onEditMenu, onDeleteMenu, onAddDish}) {
        this.#menuID = menuID;
        this.#menuDay = menuDay;
        this.#menuNum = menuNum;
        this.#dishs = dishs;
        this.onAddDish = onAddDish;
        this.onEditMenu = onEditMenu;
        this.onDeleteMenu = onDeleteMenu;
    }

    get menuID() {
        return this.#menuID;
    }

    get menuDay() {
        return this.#menuDay;
    }

    get menuNum() {
        return this.#menuNum;
    }

    get dishs () {
        return this.#dishs;
    }

    set menuDay(menuDay) {
        if (typeof menuDay !== 'number') return;
        this.#menuDay = menuDay;
    }

    set menuNum(menuNum) {
        if (typeof menuNum !== 'number') return;
        this.#menuNum = menuNum;
    }

    addDish({dishID, dishInd}) {
        this.#dishs.splice(dishInd, 0, dishID);
    }

    deleteDish({dishID}) {
        const deleteDishIndex = this.#dishs.findIndex(dish => dish == dishID);
        if (deleteDishIndex === -1) 
            return;
        this.#dishs.splice(deleteDishIndex, 1);
    }

    render(menuInd) {
        const menuEl = document.createElement('li');
        menuEl.classList.add('menu');
        menuEl.setAttribute('id', this.#menuID);

        const menuTopEl = document.createElement('div');

        const headerEl = document.createElement('header');
        headerEl.classList.add('menu__header');
        headerEl.innerHTML = week_days[this.#menuDay] + " №" + (this.#menuNum + 1);
        menuTopEl.appendChild(headerEl);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('menu__controls');

        DishBtnParams.slice(2, 4).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);

            switch(type) {
                case DishBtnTypes.EDIT_DISH:
                    buttonEl.addEventListener('click', () => this.onEditMenu({
                        menuID: this.#menuID
                    }));
                    break;
                case DishBtnTypes.DELETE_DISH:
                    buttonEl.addEventListener('click', () => this.onDeleteMenu({
                        menuID: this.#menuID
                    }));
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });

        menuTopEl.appendChild(controlsEl);

        menuEl.appendChild(menuTopEl);

        const dishsEl = document.createElement('ul');
        dishsEl.classList.add('menu__dishs-list');

        menuEl.appendChild(dishsEl);

        const buttonEl = document.createElement('button');
        buttonEl.classList.add('menu__add-dish-btn');
        buttonEl.innerHTML = 'Добавить блюдо';
        buttonEl.addEventListener('click', () => this.onAddDish({menuID: this.#menuID}));

        menuEl.appendChild(buttonEl);

        const mListEl = document.querySelector('ul.menus-list');
        mListEl.insertBefore(menuEl, mListEl.children[menuInd]);
    }
}

const DishBtnTypes = Object.freeze({
    EDIT_DISH: 'EDIT_DISH',
    DELETE_DISH: 'DELETE_DISH',
    MOVE_DISH_BACK: 'MOVE_DISH_BACK',
    MOVE_DISH_FORWARD: 'MOVE_DISH_FORWARD'
});

const DishBtnParams = Object.freeze([
    Object.freeze({
        type: DishBtnTypes.MOVE_DISH_BACK,
        className: 'dish-move-back',
        imageSrc: './assets/left-arrow.svg',
        imageAlt: 'Move to prev'
    }),
    Object.freeze({
        type: DishBtnTypes.MOVE_DISH_FORWARD,
        className: 'dish-move-forward',
        imageSrc: './assets/right-arrow.svg',
        imageAlt: 'Move to next'
    }),
    Object.freeze({
        type: DishBtnTypes.EDIT_DISH,
        className: 'dish-edit',
        imageSrc: './assets/edit.svg',
        imageAlt: 'edit'
    }),
    Object.freeze({
        type: DishBtnTypes.DELETE_DISH,
        className: 'dish-delete',
        imageSrc: './assets/delete-button.svg',
        imageAlt: 'delete'
    })
]);

class Dish {
    #dishID = '';
    #dishName = '';
    #dishType = -1;

    constructor({dishID, dishName, dishType, onEditDish, onDeleteDish, onMoveDish}) {
        this.#dishID = dishID;
        this.#dishName = dishName;
        this.#dishType = dishType;
        this.onEditDish = onEditDish;
        this.onDeleteDish = onDeleteDish;
        this.onMoveDish = onMoveDish;
    }

    get dishID() {return this.#dishID;}

    get dishName() {return this.#dishName;}

    get dishType() {return this.#dishType;}

    set dishName(newDishName) {
        if (typeof newDishName !== 'string') {
            return;
        };
        this.#dishName = newDishName;
    }

    set dishType(newDishType) {
        if (typeof newDishType !== 'number') {
            return;
        };
        this.#dishType = newDishType;
    }

    render(menuID, dishInd) {
        const dishEl = document.createElement('li');
        dishEl.classList.add('dish');
        dishEl.setAttribute('id', this.#dishID);
        const infoEl = document.createElement('ul');
        const liNameEl = document.createElement('li'), 
            liTypeEl = document.createElement('li');
        liNameEl.classList.add('dish__name');
        liNameEl.innerHTML = this.#dishName;
        liTypeEl.classList.add('dish__type');
        liTypeEl.innerHTML = dish_types[this.#dishType];

        infoEl.appendChild(liNameEl);
        infoEl.appendChild(liTypeEl);
        dishEl.appendChild(infoEl);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('dish__controls');

        DishBtnParams.forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);

            switch(type) {
                case DishBtnTypes.EDIT_DISH:
                    buttonEl.addEventListener('click', () => this.onEditDish({
                        menuID: menuID,
                        dishID: this.#dishID
                    }));
                    break;
                case DishBtnTypes.DELETE_DISH:
                    buttonEl.addEventListener('click', () => this.onDeleteDish({
                        menuID: menuID,
                        dishID: this.#dishID
                    }));
                    break;
                case DishBtnTypes.MOVE_DISH_FORWARD:
                     buttonEl.addEventListener('click', () => this.onMoveDish({
                        menuID: menuID,
                        dishID: this.#dishID,
                        direction: DishBtnTypes.MOVE_DISH_FORWARD
                    }));
                    break;
                case DishBtnTypes.MOVE_DISH_BACK:
                    buttonEl.addEventListener('click', () => this.onMoveDish({
                        menuID: menuID,
                        dishID: this.#dishID,
                        direction: DishBtnTypes.MOVE_DISH_BACK
                    }));
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });

        dishEl.appendChild(controlsEl);
        document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list`)
            .insertBefore(dishEl, document.querySelector(`li[id="${menuID}"] > ul.menu__dishs-list`).children[dishInd]);
    }
}