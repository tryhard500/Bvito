let express = require(`express`);
let app = express();
let port = 3001;

app.listen(port, function () {
    console.log(`http://localhost:${port}`);
})


// Раздача статики
app.use(express.static(`public`));


// Настройка handlebars
const hbs = require('hbs');
app.set('views', 'views');
app.set('view engine', 'hbs');

// Настройка POST-запроса
app.use(express.urlencoded({ extended: true }))


// Настройка БД
let mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/bvito');


// Схемы
let schema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 1
    },
    category: {
        type: String,
        required: true
    },
    image: String,
    isMine: Boolean,
    asNew: Boolean
}, {
    timestamps: true
});

let Product = mongoose.model('product', schema);

// Роуты
app.get(`/`, async function (req, res) {
    let data = await Product.find().limit(10);
    let options = ``;
    let categories = ['Одежда дома', 'Для дома', 'Техника'];
    for (let i = 0; i < categories.length; i++) {
        let category = categories[i];
        let selected = ``;
        if (category == data.category) {
            selected = 'selected';
        }
        options += `<option value="${category}" ${selected}>${category}</option>`;
    }
    res.render('index', {
        array: data,
        options: options
    });
});


app.get('/search', async (req, res) => {
    let title = req.query.title;
    let category = req.query.category;
    let sort = Number(req.query.sort);
    let search = {};
    let sorting = {};

    if (title) {
        search.title = title;
    }
    if (category) {
        search.category = category;
    }
    if (sort) {
        sorting.price = sort;
    }

    let data = await Product.find(search)
        .sort(sorting)
        .limit(10);

    let options = ``;
    let categories = ['Одежда', 'Для дома', 'Техника'];
    for (let i = 0; i < categories.length; i++) {
        let category = categories[i];
        let selected = ``;
        if (category == search.category) {
            selected = 'selected';
        }
        options += `<option value="${category}" ${selected}>${category}</option>`;
    }

    res.render('index', {
        array: data,
        title: title,
        options: options,
        sortUp: sorting.price == 1,
        sortDown: sorting.price == -1
    });
});


app.get('/my', async (req, res) => {
    let success = req.query.success;
    let error = req.query.error;
    let data = await Product.find({ isMine: true }).sort({ createdAt: -1 });
    res.render('my', {
        array: data,
        error: error,
        success: success
    });
});


app.post('/create', async (req, res) => {
    let title = req.body.title;
    let category = req.body.category;
    let description = req.body.description;
    let price = Number(req.body.price);
    let image = req.body.image;
    let asNew = Boolean(req.body.asNew);

    //Проверка переданных данных
    if (!title || !description || !price || !category) {
        res.redirect('/my?error=1');
        return;
    }
    if (await Product.exists({ title: title })) {
        res.redirect('/my?error=1');
        return;
    }

    if (!image) {
        image = 'icons/no-photo.png';
    }

    if (!price || price <= 0) {
        res.redirect('/my?error=1');
        return;
    }


    let product = new Product({
        title: title,
        category: category,
        description: description,
        price: price,
        image: image,
        asNew: asNew,
        isMine: true
    });

    await product.save();
    res.redirect('/my?success=1');
});


app.get('/remove', async (req, res) => {
    let id = req.query.id;
    await Product.deleteOne({ _id: id });
    res.redirect('/my');
});

app.get(`/edit`, async (req, res) => {
    let id = req.query.id;
    let success = req.query.success;
    let error = req.query.error;

    let product = await Product.findOne({ _id: id });

    let options = ``;
    let categories = ['Одежда', 'Для дома', 'Техника'];
    for (let i = 0; i < categories.length; i++) {
        let category = categories[i];
        let selected = ``;
        if (category == product.category) {
            selected = 'selected';
        }
        options += `<option value="${category}" ${selected}>${category}</option>`;
    }

    res.render(`edit`, {
        product: product,
        options: options,
        error: error,
        success: success
    });
});

app.post('/edit', async (req, res) => {
    let id = req.query.id;
    let product = await Product.findOne({ _id: id });
    product.asNew = Boolean(req.body.asNew);
    product.title = req.body.title;
    product.category = req.body.category;
    product.description = req.body.description;
    product.price = Number(req.body.price);
    product.image = req.body.image;

    try {
        await product.save();
        res.redirect(`/edit?id=${id}&success=1`)
    } catch (error) {
        res.redirect(`/edit?id=${id}&error=1`)
    }
});